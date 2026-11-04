# Pilotage de la fidélisation : prédire le churn client

**Voir le dashboard interactif : https://cnanaj-wq.github.io/pilotage-fidelisation/**

![Churn client : du besoin métier à l'action](img/fil-du-projet.png)

## Le projet

Un démonstrateur de bout en bout, de la question métier jusqu'à la liste d'appels de l'équipe fidélisation.
Il s'appuie sur le jeu de données public Telco Customer Churn (7 043 clients d'un opérateur télécom) et
enchaîne Dataiku, PostgreSQL, Power BI et Qlik Sense.

Ce dépôt contient la version web du dashboard : les mêmes données et les mêmes règles que les rapports
Power BI et Qlik Sense, consultables en ligne sans licence.

## Le besoin métier

Dans un abonnement, la résiliation arrive presque toujours comme une surprise : quand le client appelle pour
partir, il est trop tard. Un tableau de bord classique dit combien de clients ont été perdus le mois dernier.
Il permet de constater, pas d'agir.

Le projet répond à trois questions de la direction commerciale et de l'équipe fidélisation :

1. Quels clients risquent de résilier ?
2. Combien de revenu mensuel est en jeu ?
3. Qui contacter en priorité, et avec quelle action ?

Le point de départ : 1 869 clients sur 7 043 ont résilié, soit 26,5 %, un client sur quatre.

## La solution mise en place

| Étape | Ce qui a été fait | Outil |
|---|---|---|
| Des données fiables | Règles de gestion écrites (RG01 à RG10), aucun doublon, 11 nouveaux clients conservés au lieu d'être supprimés | Dataiku |
| Comprendre | 6 indicateurs métier : ancienneté, nombre de services, hausse de facture, contrat sans engagement… | Dataiku, Python |
| Prédire | Un score de risque par client, régression logistique retenue pour sa lisibilité (AUC 0,860 sur 1 394 clients test) | Dataiku |
| Prioriser | Segments élevé (≥ 60 %), moyen et faible, publiés dans une table pseudonymisée | PostgreSQL |
| Agir | Une action suggérée par client : offre d'engagement, appel d'accueil, revue tarifaire fibre… | Power BI, Qlik Sense |

Autour de la chaîne, des garanties de confiance :

- **Gouvernance :** une définition écrite par KPI, un dictionnaire et des règles de gestion.
- **Sécurité :** compte BI en lecture seule, codes clients pseudonymisés (HMAC-SHA256), sans genre ni âge côté BI.
- **Fraîcheur :** recalcul planifié chaque lundi, contrôles qualité bloquants et alerte en cas d'échec.
- **Équité :** un contrôle compare le ciblage par genre et par statut senior, et signale les écarts à arbitrer.

## L'impact métier

- **Une liste de travail au lieu d'un constat :** 1 039 clients actifs à risque élevé, classés du plus au moins
  probable, chacun avec une action proposée.
- **Le revenu en jeu, chiffré :** 79 828 $ de revenu mensuel exposé, soit 25,2 % du revenu des clients actifs.
- **Un ciblage efficace :** sur les clients test, appeler environ un tiers des clients aurait permis de toucher
  les trois quarts des départs (75,7 %).
- **Un levier prioritaire identifié :** un client sans engagement part 15 fois plus souvent qu'un client engagé
  deux ans (42,7 % contre 2,8 %). 1 011 des 1 039 clients prioritaires relèvent de l'offre d'engagement.
- **Des chiffres qui ne se discutent plus :** Power BI et Qlik Sense affichent les mêmes valeurs, contrôlées
  contre la base (21 valeurs comparées, 21 identiques).
- **Un risque rendu visible :** l'écart de ciblage sur les clients seniors (ratio 0,48) est affiché pour que le
  métier décide, au lieu de rester caché dans le modèle.

Ces résultats viennent de données publiques d'exemple : c'est un démonstrateur, pas un cas client. Le revenu
exposé est un ordre de grandeur, pas une perte prévue. L'effet réel des actions se mesure en les testant face à
un groupe témoin.

## Le dashboard en ligne

- Quatre pages : Synthèse, Par segment, Plan d'action, Gouvernance.
- Sélection croisée comme dans Qlik Sense : un clic sur une barre filtre toutes les pages.
- Liste des clients à appeler, triable, avec recherche et export CSV.
- Chaque page montre aussi le même écran dans Power BI et dans Qlik Sense.

Le site est écrit en HTML, CSS et JavaScript, sans bibliothèque externe. Pour l'essayer sur votre ordinateur :
téléchargez le dépôt, lancez `python -m http.server` dans le dossier, puis ouvrez http://localhost:8000.

## Source des données

Jeu de données public Telco Customer Churn, publié sur Kaggle et issu des jeux de données d'exemple d'IBM :
https://www.kaggle.com/datasets/blastchar/telco-customer-churn

Cédric NANA, consultant Data Analytics.
