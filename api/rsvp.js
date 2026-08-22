// /api/rsvp.js
// Fonction serverless Vercel : reçoit le POST du formulaire (civil ou religieux)
// et ajoute une ligne dans le Google Sheet via un service account.

const { google } = require('googleapis');

module.exports = async (req, res) => {
  // On n'accepte que les requêtes POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const {
      nom,
      evenement,                 // "civil" ou "religieux"
      presence,                  // valeur du slider / choupisson
      preference_alimentaire,    // texte libre
      petit_mot,                 // texte libre (déclaration, blague, etc.)
      nb_hesitations_choupisson, // nombre de va-et-vient du drag
      musique_ecoutee,           // booléen
      couchages,                 // 0, 1 ou 2, uniquement pour religieux
    } = req.body;

    // Validation minimale — on ne veut pas écrire n'importe quoi dans le Sheet
    if (!nom || !evenement) {
      return res.status(400).json({ error: 'Nom et événement sont requis' });
    }

    // Authentification via le service account (clé stockée en variable d'env)
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const timestamp = new Date().toISOString();

    // Une ligne = une soumission. Ordre des colonnes à faire correspondre
    // à l'en-tête de ton Google Sheet :
    // Timestamp | Nom | Événement | Présence | Préférence alimentaire |
    // Petit mot | Nb hésitations choupisson | Musique écoutée | Couchages
    const row = [
      timestamp,
      nom,
      evenement,
      presence ?? '',
      preference_alimentaire ?? '',
      petit_mot ?? '',
      nb_hesitations_choupisson ?? '',
      musique_ecoutee ? 'Oui' : 'Non',
      couchages ?? '',
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Feuille1!A:I', // adapte le nom de l'onglet si besoin
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erreur écriture Google Sheet:', error);
    return res.status(500).json({ error: 'Erreur serveur, réessaie plus tard' });
  }
};
