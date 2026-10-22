# Rang Moy Gaaw — Frontend

Projet académique — Master 2 Systèmes d'Information Répartis, Université Cheikh Anta Diop de Dakar (2026).

Interface web de **Rang Moy Gaaw**, une plateforme de mobilité urbaine pour le transport sénégalais (bus, BRT, navettes maritimes).

- API : [RangMouyGaaw-Backend](https://github.com/Ndeye-Fatou-SOW/RangMouyGaaw-Backend)
- Démonstration vidéo : [voir la vidéo](https://ucadedu-my.sharepoint.com/:v:/g/personal/ndeyefatou20_sow_ucad_edu_sn/IQDv5U1DwAalRaEkq-WVOAlZATMTkjBp15FNe6y_w9BDXWY?e=w7iGvX)

## Fonctionnalités

**Espace citoyen**
- Carte des bus en temps réel (Leaflet, positions reçues par WebSocket STOMP)
- Achat de ticket
- Signalement d'incident
- Assistant « Dama dem », en français et en wolof

**Espace administrateur**
- Tableau de bord
- Gestion des bus, des lignes, des chauffeurs et des incidents

**Commun**
- Inscription et connexion, routes protégées par des guards selon le rôle

## Technologies

Angular 21 · TypeScript · RxJS · Leaflet · STOMP (WebSocket) · Bootstrap 5

## Lancer le projet

Prérequis : Node.js et le backend démarré.

```bash
npm install
npm start
```

L'application est servie sur http://localhost:4200. Les appels à l'API sont redirigés vers le backend par `proxy.conf.json`.

## Structure

```
src/app/core/       services (authentification, API) et guards
src/app/features/   auth, citoyen (carte, tickets, incidents, assistant), admin
```

## Auteure

Ndéye Fatou SOW — Master 2 Systèmes d'Information Répartis, Université Cheikh Anta Diop de Dakar
Portfolio : https://ndeye-fatou-sow.github.io/ndeyefatousow.github.io/
