# Guide de Configuration Firebase Spark — GESTION BOISSONS

Ce guide détaille pas à pas la mise en service du backend Firebase pour l'application **Gestion Boissons**.

---

## ⚡ RÈGLE ABSOLUE : Forfait Spark (100% Gratuit)
> **Aucune carte bancaire n'est requise.**
> L'application est spécifiquement conçue pour fonctionner avec les quotas gratuits du forfait **Spark** de Firebase :
> - **Authentication :** Gratuit (comptes illimités, 6 comptes requis ici)
> - **Cloud Firestore :** 50 000 lectures / jour, 20 000 écritures / jour, 1 Go de stockage (gratuit)
> - **Realtime Database :** 1 Go de stockage, 10 Go de bande passante / mois, jusqu'à 100 connexions simultanées (gratuit)
> 
> **Ne pas passer au forfait Blaze (payant).**

---

## Étape 1 : Créer votre projet Firebase
1. Rendez-vous sur la console officielle : [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Cliquez sur **« Ajouter un projet »**.
3. Nommez votre projet (ex: `gestion-boissons-boutique`).
4. Désactivez Google Analytics (optionnel, permet un démarrage plus rapide).
5. Validez la création du projet.

---

## Étape 2 : Activer l'Authentification (Email / Mot de passe)
1. Dans le menu de gauche, rendez-vous sur **Build > Authentication**.
2. Cliquez sur **« Commencer »**.
3. Dans l'onglet **« Sign-in method »**, sélectionnez **« Adresse e-mail/Mot de passe »**.
4. Activez l'option **« Adresse e-mail/Mot de passe »** (ne pas activer les liens sans mot de passe).
5. Cliquez sur **« Enregistrer »**.

---

## Étape 3 : Activer Cloud Firestore & Déployer les Règles
1. Dans le menu de gauche, rendez-vous sur **Build > Firestore Database**.
2. Cliquez sur **« Créer une base de données »**.
3. Choisissez l'emplacement le plus proche (ex: `europe-west1` ou `us-central1`).
4. Sélectionnez le **Mode production** puis cliquez sur **Créer**.
5. Rendez-vous dans l'onglet **« Règles »** (Rules) de Firestore.
6. Remplacez l'intégralité du contenu par les règles fournies dans le fichier `firestore.rules` du projet :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }

    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn() && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    match /users/{userId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn() && (isOwner(userId) || isAdmin());
      allow update: if isSignedIn() && (isAdmin() || (isOwner(userId) && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lastSeenAt', 'isOnline', 'lastLoginAt'])));
      allow delete: if isAdmin();
    }

    match /admins/{userId} {
      allow read: if isSignedIn();
      allow write: if isAdmin() || (isSignedIn() && !exists(/databases/$(database)/documents/admins/$(request.auth.uid)));
    }

    match /_health_check/{docId} {
      allow read: if true;
      allow write: if false;
    }

    match /products/{productId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    match /sales/{saleId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update, delete: if isAdmin();
    }

    match /stock_movements/{movId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update, delete: if isAdmin();
    }

    match /purchases/{purchaseId} {
      allow read, write: if isAdmin();
    }

    match /audit_logs/{logId} {
      allow read: if isAdmin();
      allow create: if isSignedIn();
      allow update, delete: if false;
    }
  }
}
```
7. Cliquez sur **« Publier »** (Publish).

---

## Étape 4 : Activer Realtime Database (Présence en ligne)
1. Dans le menu de gauche, rendez-vous sur **Build > Realtime Database**.
2. Cliquez sur **« Créer une base de données »**.
3. Choisissez un emplacement géographique (ex: Belgique ou États-Unis).
4. Démarrez en **Mode verrouillé** (Locked mode).
5. Allez dans l'onglet **« Règles »** et collez le contenu suivant :
```json
{
  "rules": {
    "presence": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```
6. Cliquez sur **« Publier »**.
7. Notez l'URL de votre base (format : `https://<votre-projet>-default-rtdb.firebaseio.com`).

---

## Étape 5 : Récupérer les clés de configuration Web
1. Cliquez sur la roue dentée ⚙️ en haut à gauche > **Paramètres du projet** (Project settings).
2. Dans la section **« Vos applications »**, cliquez sur l'icône Web **`</>`**.
3. Nommez l'application (ex: `Gestion Boissons Web`) et validez sans cocher Firebase Hosting.
4. Repérez l'objet `firebaseConfig` affiché à l'écran :
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

---

## Étape 6 : Renseigner les clés dans l'application
Vous disposez de **deux méthodes simples** :

### Méthode A : Directement dans l'interface de l'application (Recommandé)
1. Ouvrez l'application dans votre navigateur.
2. Sur l'écran de connexion ou dans le menu, cliquez sur **« Renseigner la configuration Firebase »** (ou l'onglet *Configuration & PWA*).
3. Remplissez les champs `apiKey`, `projectId`, `appId`, et `databaseURL`.
4. Cliquez sur **« Enregistrer et appliquer la configuration »**.
5. Cliquez sur **« Tester la connexion en direct »** pour vérifier le dialogue avec Firestore.

### Méthode B : Via le fichier `.env`
Créez ou modifiez le fichier `.env` à la racine :
```env
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="votre-projet.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="votre-projet"
VITE_FIREBASE_STORAGE_BUCKET="votre-projet.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"
VITE_FIREBASE_DATABASE_URL="https://votre-projet-default-rtdb.firebaseio.com"
```

---

## Étape 7 : Création du premier compte Patron / Administrateur
1. Ouvrez l'application.
2. Sur l'écran de connexion, choisissez l'onglet **« Premier Patron / Admin »**.
3. Renseignez votre nom, email et mot de passe (minimum 6 caractères).
4. Validez : le compte est immédiatement activé avec le rôle **Administrateur / Patron** et les droits complets.
5. Une fois connecté, vous pourrez créer les comptes des autres collaborateurs (magasiniers, vendeurs) dans la limite des **6 comptes autorisés**.
