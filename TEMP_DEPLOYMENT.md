# Déploiement Temporaire de Test

Cette configuration prépare un environnement temporaire de test avec :

- Frontend sur Netlify
- API Laravel sur Render
- Queue worker sur Render
- Reverb sur Render
- PostgreSQL managé sur Render

Objectif : conserver le navigateur en same-origin sur le domaine Netlify en utilisant un proxy Netlify vers l'API Render.

## Architecture

- Domaine frontend temporaire : `https://tlm-temp-front.netlify.app`
- API temporaire : `https://tlm-temp-api.onrender.com`
- Reverb temporaire : `https://tlm-temp-reverb.onrender.com`
- Le frontend appelle `/api/v1` et `/broadcasting/auth`
- Netlify proxy ces chemins vers Render via [Frontend/netlify.toml](Frontend/netlify.toml)

## Fichiers ajoutés

- [render.yaml](render.yaml)
- [Backend/Dockerfile](Backend/Dockerfile)
- [Backend/scripts/start-render.sh](Backend/scripts/start-render.sh)
- [Frontend/netlify.toml](Frontend/netlify.toml)

## Déploiement Render

1. Importer le dépôt dans Render.
2. Utiliser le blueprint [render.yaml](render.yaml).
3. Renseigner `APP_KEY` manuellement sur les 3 services avec une valeur Laravel valide :

```bash
cd Backend
php artisan key:generate --show
```

1. Une fois le service `tlm-temp-api` créé, vérifier son URL finale.
2. Si Render attribue un domaine différent de `https://tlm-temp-api.onrender.com`, mettre à jour :

- [render.yaml](render.yaml)
- [Frontend/netlify.toml](Frontend/netlify.toml)

1. Déployer ensuite le service `tlm-temp-reverb` et relever son domaine réel.

## Déploiement Netlify

1. Importer le dossier Frontend ou le dépôt complet dans Netlify.
2. Base directory : `Frontend`
3. Build command : `npm run build`
4. Publish directory : `dist`
5. Définir les variables d'environnement Netlify :

```text
VITE_API_URL=/api/v1
VITE_REVERB_HOST=tlm-temp-reverb.onrender.com
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
VITE_REVERB_APP_KEY=<copier la valeur REVERB_APP_KEY du service Render>
```

1. Si Netlify attribue un domaine différent de `https://tlm-temp-front.netlify.app`, mettre à jour dans Render :

```text
FRONTEND_URL=https://<votre-domaine-netlify>
CORS_ALLOWED_ORIGINS=https://<votre-domaine-netlify>
```

Puis redéployer `tlm-temp-api`.

## Vérifications minimales

1. Ouvrir le frontend Netlify.
2. Vérifier que l'appel navigateur cible `/api/v1/...` et non un domaine API absolu.
3. Vérifier `GET /up` sur l'API Render.
4. Tester login, 2FA, dashboard, mot de passe oublié.
5. Si les websockets sont requis, vérifier aussi l'abonnement Reverb après connexion.

## Limites connues

- Je ne peux pas déclencher le déploiement réel depuis ici sans accès à un compte Netlify/Render déjà authentifié dans l'environnement.
- Le mail est configuré en `log` dans [render.yaml](render.yaml) pour un test temporaire sans SMTP réel.
- Si vous voulez tester les emails réels, remplacez `MAIL_MAILER=log` par une configuration SMTP temporaire.
