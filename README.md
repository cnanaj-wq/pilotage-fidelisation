# Pilotage de la fidélisation — version web interactive

Version web du dashboard de prédiction du churn réalisé dans Power BI Desktop et Qlik Sense Desktop :
qui risque de partir, combien de revenu est en jeu, qui appeler en premier.

**Voir le dashboard : https://cnanaj-wq.github.io/pilotage-fidelisation/**

- Quatre pages : Synthèse, Par segment, Plan d'action, Gouvernance.
- Sélection croisée comme dans Qlik Sense : un clic sur une barre filtre toutes les pages.
- Liste des clients à appeler, triable, avec recherche et export CSV.
- Chaque page montre aussi le même écran dans Power BI et dans Qlik Sense.

Mêmes données et mêmes règles que les deux rapports : données publiques Kaggle Telco Customer Churn
(7 043 clients), score calculé dans Dataiku et publié dans PostgreSQL, codes clients pseudonymisés.

HTML, CSS et JavaScript sans dépendance : il suffit d'ouvrir `index.html` via un petit serveur local
(`python -m http.server`).

Cédric NANA, consultant Data Analytics.
