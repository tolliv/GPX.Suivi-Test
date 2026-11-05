// v=2611.03a
//==================================================================================================
// Gestion des requêtes pour Supabase
//==================================================================================================

// URL de votre application web Google Apps Script
var API_URL = "?";
var API_KEY = "?";
var USER    = "?";
var ID      = "?";

//--------------------------------------------------------------------------------------------------
// Effacement tout ce qui concerne l'utilisateur actuel
//--------------------------------------------------------------------------------------------------
async function SupabaseClearAllInformations()
{
  const t0 = performance.now();
  const lCmd = "user=eq." + USER;
  const lStatus = await SupabaseDelete(lCmd);
  const delta = Math.round(0.100 * (performance.now() - t0)) / 100;
  console.log("Suppression " + lStatus + " (" + delta + "s)");
}


//--------------------------------------------------------------------------------------------------
// Vérification de la connexion à la base de données
// Lecture d'une ligne

//--------------------------------------------------------------------------------------------------
async function SupabaseTestConnexion()
{
  var lRet;
  var lCmd;
  var retStatus;
  do
  {
    // Connexion
    lCmd = "limit=1";
    lRet = await SupabaseRead(lCmd);
    if (lRet.status != "OK")
    {
      retStatus = lRet.status;
      break;
    }

    // Ecriture 301 (ne sert qu'au test écriture/lecture)
    const lDate = DateSupabase();
    const nouveauPoint =
    {
        date: lDate,
        user: USER,
        type: 301,
        msg: "test Write/Read"
    };
    lRet = await SupabaseWrite(nouveauPoint);
    if (lRet != "OK")
    {
      retStatus = "Erreur pendant le test d'écriture";
      break;
    }

    // Relecture 301 (ne sert qu'au test écriture/lecture)
    lCmd = "user=eq." + USER
         + "&type=eq.301"
         + "&order=date.desc"
         + "&limit=100";
    lRet = await SupabaseRead(lCmd);
    if ( (lRet.status != "OK") || (lRet.length == 0) )
    {
      retStatus = "Erreur pendant le test de lecture";
      break;
    }

    // Suppression si 301 existant
    if (lRet.length > 0)
    {
      const lCmd = "user=eq." + USER
                 + "&type=eq.301";
      let lStatus = await SupabaseDelete(lCmd);
      if (lStatus != "OK")
      {
        retStatus = "Erreur pendant le test de suppression";
        break;
      }
    }

    // Relecture 301 (on ne doit plus en avoir)
    lCmd = "user=eq." + USER
         + "&type=eq.301"
         + "&order=date.desc"
         + "&limit=100";
    lRet = await SupabaseRead(lCmd);
    if ( (lRet.status != "OK") || (lRet.length != 0) )
    {
      retStatus = "Erreur pendant le test de relecture";
      break;
    }

    // Tout est bon
    retStatus = "OK";
  } while(0);
  return (retStatus);
}

//--------------------------------------------------------------------------------------------------
// Ecrit le Prénom
// Depuis la variable dans gPrenom
//--------------------------------------------------------------------------------------------------
async function SupabaseWritePrenom(nouveau)
{
  // Effacement des anciens prénoms
  const lCmd = "user=eq." + USER
             + "&type=eq.1000";
  let lStatus = await SupabaseDelete(lCmd);

  // Ecriture du nouveau prénom
  const lDate = DateSupabase();
  const nouveauPoint =
  {
      date: lDate,
      user: USER,
      type: 1000,
      msg: nouveau
  };
  const lRet = await SupabaseWrite(nouveauPoint);
  return(lRet);
}

//--------------------------------------------------------------------------------------------------
// Lit le prénom
//--------------------------------------------------------------------------------------------------
async function SupabaseReadPrenom()
{
  var lRet;
  var lCmd;
  var retStatus;

  // Lecture 1000
  lCmd = "user=eq." + USER
       + "&type=eq.1000"
       + "&order=date.desc"
       + "&limit=1";
  lRet = await SupabaseRead(lCmd);
  return (lRet);
}

//--------------------------------------------------------------------------------------------------
// Ecrit le nom de l'itinéraire
// Depuis la variable dans gNomItineraire
//--------------------------------------------------------------------------------------------------
async function SupabaseWriteNomItineraire(nouveau)
{
  const lDate = DateSupabase();
  const nouveauPoint =
  {
      date: lDate,
      user: USER,
      type: 302,
      msg: nouveau
  };
  lRet = await SupabaseWrite(nouveauPoint);
}

//--------------------------------------------------------------------------------------------------
// Lit le nom de l'itinéraire
// Est mis dans gNomItineraire
//--------------------------------------------------------------------------------------------------
async function SupabaseReadNomItineraire()
{
  var lRet;
  var lCmd;
  var retStatus;

  // Lecture 302
  lCmd = "user=eq." + USER
       + "&type=eq.302"
       + "&order=date.desc"
       + "&limit=1";
  lRet = await SupabaseRead(lCmd);
  return (lRet);
}

//--------------------------------------------------------------------------------------------------
// Efface l'itinéraire en cours dans la base de données
//--------------------------------------------------------------------------------------------------
async function SupabaseEffaceItineraire()
{
  // Efface l'itinéraire 0
  const lCmd = "user=eq." + USER
             + "&type=eq.0";
  let lStatus = await SupabaseDelete(lCmd);
  return(lStatus);
}


//--------------------------------------------------------------------------------------------------
// Encode et compresse
//--------------------------------------------------------------------------------------------------
async function encodeSupabaseConfig(url, key, usr)
{
  try
  {
    const payload = JSON.stringify({ u: url, k: key, i: usr });

    // Compression native (deflate-raw)
    const stream = new Blob([payload]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const compressedBuffer = await new Response(stream).arrayBuffer();
    let bytes = new Uint8Array(compressedBuffer);
    for (let i = 0; i < bytes.length; bytes[i++] ^= 0x69);

    // Conversion en Base64 URL-safe
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize)
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));

    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  catch(error)
  {
    console.log("Erreur encodeSupabaseConfig : " + error);
    return("");
  }
}

//--------------------------------------------------------------------------------------------------
// Décode et décompresse
//--------------------------------------------------------------------------------------------------
async function decodeSupabaseConfig(encodedStr)
{
  try
  {
    // Restauration du Base64 standard
    let base64 = encodedStr.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';

    const binary = atob(base64);
    let bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++)
        bytes[i] = binary.charCodeAt(i) ^0x69;

    // Décompression native
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const decompressedBuffer = await new Response(stream).arrayBuffer();

    const jsonString = new TextDecoder().decode(decompressedBuffer);
    const obj = JSON.parse(jsonString);

    return {
      url: obj.u,
      key: obj.k,
      usr: obj.i
    };
  }
  catch(error)
  {
    console.log("Erreur decodeSupabaseConfig : " + error);
    return {
      url: "",
      key: "",
      usr: ""
    }
  }
}

//====================== COMMANDES DE BASE =========================================================


//--------------------------------------------------------------------------------------------------
// Envoie un nouveau point dans la base de données
//--------------------------------------------------------------------------------------------------
async function SupabaseWrite(data)
{
  try
  {
    const response = await fetch(API_URL,
    {
      method: 'POST',
      headers: {
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal' // Ne renvoie pas la ligne insérée
      },
      body: JSON.stringify(data)
    });

    if (!response.ok)
    {
      const error = await response.json();
      return("Erreur SupabaseSendPoint : " + error.message);
    }
   return("OK");
  }
  catch (error)
  {
    return("Erreur SupabaseSendPoint : " + error);
  }
}

//--------------------------------------------------------------------------------------------------
// Lit un nombre de points dans la base de données
// En partant de la fin
//--------------------------------------------------------------------------------------------------
async function SupabaseRead(pCmd)
{
  try
  {
    const url = API_URL + "?" + pCmd;
    const response = await fetch(url,
    {
      method: 'GET',
      headers:
      {
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok)
    {
      const error = await response.json();
      return {status:"Erreur SupabaseRead : " + error.message, length:0, data:null};
    }

    const lData = await response.json();
    if (lData && lData.length == 0)
      return {status:"OK", length:0, data:null};

    if (lData && lData.length > 0)
    {
      return {status:"OK", length:lData.length , data:lData};
    }
  }
  catch (error)
  {
      return {status:"Erreur SupabaseRead", length:0, data:null};
  }
}

//--------------------------------------------------------------------------------------------------
// Supprime des éléments dans la base de données selon une condition
//--------------------------------------------------------------------------------------------------
async function SupabaseDelete(pCmd)
{
  try
  {
    const url = API_URL + "?" + pCmd;
    const response = await fetch(url,
    {
      method: 'DELETE', // Méthode HTTP pour supprimer
      headers: {
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok)
    {
      const error = await response.json();
      return("Erreur SupabaseDelete : " + error.message);
    }
    return("OK");
  }
  catch (error)
  {
    return("Erreur SupabaseDelete : " + error);
  }
}

//--------------------------------------------------------------------------------------------------
// Compte le nombre de points correspondant à un critère
//--------------------------------------------------------------------------------------------------
async function SupabaseCount(pCmd)
{
  try
  {
    const url = API_URL + "?" + pCmd;
    const response = await fetch(url,
    {
      method: 'GET',
      headers: {
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
        'Prefer': 'count=exact' // Demande à Supabase de calculer le total
      }
    });

    if (!response.ok) {
      const error = await response.json();
      return { status: "Erreur SupabaseCount : " + error.message, count: -1 };
    }

    // Le résultat se trouve dans le header 'content-range'
    // Format reçu : "0-0/125" (où 125 est le total)
    const contentRange = response.headers.get('content-range');
    let total = 0;

    if (contentRange)
    {
      const parts = contentRange.split('/');
      if (parts.length > 1)
      {
        total = parseInt(parts[1], 10);
      }
    }
    return { status: "OK", count: total };
  }
  catch (error)
  {
    return { status: "Erreur SupabaseCount : " + error, count: -1 };
  }
}
