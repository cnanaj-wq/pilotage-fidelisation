// Pilotage de la fidélisation · version web
// Mêmes définitions de KPI que les rapports Power BI et Qlik Sense (construire_app.py) :
// actif = non résilié, risque élevé = probabilité de départ ≥ 60 %, churn = résiliés / clients.
(function () {
  "use strict";

  const D = window.DONNEES;
  const L = D.libelles;
  const COULEURS = { rouge: "#c90a1b", bleu: "#005796", gris: "#808080" };

  const clients = D.clients.map((c) => ({
    id: c[0], mois: c[1], charges: c[2], churn: c[3], services: c[4], proba: c[5],
    risque: c[6], anciennete: c[7], contrat: c[8], internet: c[9], paiement: c[10], action: c[11],
  }));

  // ------------------------------------------------------------ sélection partagée par toutes les pages
  const DIMENSIONS = {
    contrat: { libelle: "Contrat", valeurs: L.contrat },
    risque: { libelle: "Segment de risque", valeurs: L.risque },
    anciennete: { libelle: "Ancienneté", valeurs: L.anciennete },
    paiement: { libelle: "Mode de paiement", valeurs: L.paiement },
    internet: { libelle: "Internet", valeurs: L.internet },
  };
  const selection = Object.fromEntries(Object.keys(DIMENSIONS).map((d) => [d, new Set()]));

  function filtrer(sauf) {
    return clients.filter((c) => Object.keys(selection).every(
      (d) => d === sauf || selection[d].size === 0 || selection[d].has(c[d])));
  }

  function basculer(dim, valeur) {
    const s = selection[dim];
    s.has(valeur) ? s.delete(valeur) : s.add(valeur);
    toutAfficher();
  }

  // ------------------------------------------------------------ formats français
  const fEntier = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  const fPct = new Intl.NumberFormat("fr-FR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fDec = (n) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: n, maximumFractionDigits: n });
  // Espace insécable classique plutôt que l'espace fine, trop étroite en Segoe UI (« 1 039 », pas « 1039 »)
  const espace = (t) => t.replace(/ /g, " ");
  const entier = (v) => espace(fEntier.format(Math.round(v)));
  const pct = (v) => (Number.isFinite(v) ? espace(fPct.format(v)) : "–");
  const montant = (v) => entier(v) + " $";
  const montant2 = (v) => espace(fDec(2).format(v)) + " $";
  const dec2 = (v) => fDec(2).format(v);
  const echap = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const $ = (sel) => document.querySelector(sel);

  // ------------------------------------------------------------ mesures
  function mesures(liste) {
    const actifs = liste.filter((c) => c.churn === 0);
    const eleve = actifs.filter((c) => c.risque === 0);
    const somme = (l) => l.reduce((t, c) => t + c.charges, 0);
    const resilies = liste.length - actifs.length;
    return {
      clients: liste.length, resilies, actifs: actifs.length, eleve,
      churn: resilies / liste.length, revExpose: somme(eleve), revActifs: somme(actifs),
    };
  }
  const tauxChurn = (liste) => (liste.length ? liste.filter((c) => c.churn === 1).length / liste.length : NaN);

  function churnPar(liste, dim, valeurs) {
    return valeurs.map((libelle, i) => {
      const groupe = liste.filter((c) => c[dim] === i);
      return { libelle, index: i, valeur: tauxChurn(groupe), n: groupe.length };
    }).filter((p) => p.n > 0);
  }

  // ------------------------------------------------------------ composants
  function kpi({ titre, valeur, repere = "", legende = "", style = "" }) {
    return `<div class="kpi ${style}">
      <p class="kpi__titre">${titre}</p>
      <div class="kpi__ligne"><span class="kpi__valeur">${valeur}</span>${repere ? `<span class="kpi__repere">${repere}</span>` : ""}</div>
      ${legende ? `<p class="kpi__legende">${legende}</p>` : ""}
    </div>`;
  }

  const VIDE = '<p class="vide">Aucun client ne correspond à cette sélection. Retirez un filtre pour élargir.</p>';

  // Barres horizontales ; dim renseignée = barres cliquables qui filtrent toutes les pages
  function barresH(id, points, format, couleur, dim) {
    const zone = document.getElementById(id);
    if (!points.length) { zone.innerHTML = VIDE; return; }
    const max = Math.max(...points.map((p) => p.valeur)) || 1;
    const larg = Math.max(...points.map((p) => p.libelle.length)) * 0.55 + 1;
    const actif = dim && selection[dim].size > 0;
    zone.innerHTML = `<div class="barres-h" style="--larg-lib:${larg}em">${points.map((p) => {
      const contenu = `<span class="barre-h__libelle">${echap(p.libelle)}</span>
        <span class="barre-h__piste"><span class="barre-h__barre${actif && !selection[dim].has(p.index) ? " estompe" : ""}"
          style="width:${(p.valeur / max) * 88}%;background:${couleur(p)}"></span><span class="barre-h__valeur">${format(p.valeur)}</span></span>`;
      return dim
        ? `<button type="button" class="barre-h cliquable" data-dim="${dim}" data-index="${p.index}" aria-pressed="${selection[dim].has(p.index)}"
             aria-label="${echap(p.libelle)} : ${format(p.valeur)}. Filtrer sur cette valeur">${contenu}</button>`
        : `<div class="barre-h">${contenu}</div>`;
    }).join("")}</div>`;
  }

  function barresV(id, points, format, couleur, dim) {
    const zone = document.getElementById(id);
    if (!points.length) { zone.innerHTML = VIDE; return; }
    const max = Math.max(...points.map((p) => p.valeur)) || 1;
    const actif = dim && selection[dim].size > 0;
    zone.innerHTML = `<div class="barres-v">${points.map((p) => {
      const contenu = `<span class="barre-v__zone"><span class="barre-v__valeur">${format(p.valeur)}</span>
        <span class="barre-v__barre${actif && !selection[dim].has(p.index) ? " estompe" : ""}"
          style="height:${(p.valeur / max) * 170}px;background:${couleur(p)}"></span></span>
        <span class="barre-v__libelle">${echap(p.libelle)}</span>`;
      return dim
        ? `<button type="button" class="barre-v cliquable" data-dim="${dim}" data-index="${p.index}" aria-pressed="${selection[dim].has(p.index)}"
             aria-label="${echap(p.libelle)} : ${format(p.valeur)}. Filtrer sur cette valeur">${contenu}</button>`
        : `<div class="barre-v">${contenu}</div>`;
    }).join("")}</div>`;
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest(".cliquable[data-dim]");
    if (b) basculer(b.dataset.dim, Number(b.dataset.index));
  });

  const auDessus = (moyenne) => (p) => (p.valeur > moyenne ? COULEURS.rouge : COULEURS.bleu);
  const moyenneTexte = (m) => `Taux de churn · rouge = au-dessus de la moyenne de la sélection (${pct(m)})`;

  // ------------------------------------------------------------ 1. Synthèse
  function synthese() {
    const f = filtrer();
    const m = mesures(f);
    const testes = D.equite.filter((e) => e.axe === "Genre").reduce((t, e) => t + e.clients, 0);
    $("#kpis-synthese").innerHTML = [
      kpi({ titre: "Clients actifs à risque élevé", valeur: entier(m.eleve.length), repere: pct(m.eleve.length / m.actifs),
        legende: `des ${entier(m.actifs)} clients actifs · score ≥ 60 %` }),
      kpi({ titre: "Revenu mensuel exposé", valeur: montant(m.revExpose), repere: pct(m.revExpose / m.revActifs),
        legende: "du revenu mensuel des clients actifs" }),
      kpi({ titre: "Taux de churn observé", valeur: pct(m.churn), repere: entier(m.resilies),
        legende: `clients résiliés sur ${entier(m.clients)}`, style: "kpi--bleu" }),
      kpi({ titre: "Fiabilité du score (AUC)", valeur: fDec(3).format(D.auc), repere: entier(testes),
        legende: "clients test · prototype, hors filtres", style: "kpi--bleu" }),
    ].join("");
    $("#bandeau-revenu").textContent = m.clients
      ? `${entier(m.eleve.length)} clients actifs à risque élevé représentent ${entier(m.revExpose)} $ par mois, soit ${pct(m.revExpose / m.revActifs)} du revenu des clients actifs.`
      : "Aucun client dans la sélection en cours.";

    const baseContrat = filtrer("contrat");
    const moyContrat = tauxChurn(baseContrat);
    $("#st-contrat").textContent = `Taux de résiliation par type de contrat · rouge = au-dessus de la moyenne (${pct(moyContrat)})`;
    barresH("g-contrat", churnPar(baseContrat, "contrat", L.contrat), pct, auDessus(moyContrat), "contrat");

    const baseRisque = filtrer("risque").filter((c) => c.churn === 0);
    const couleurRisque = [COULEURS.rouge, COULEURS.gris, COULEURS.bleu];
    barresH("g-risque", L.risque.map((libelle, i) => ({ libelle, index: i, valeur: baseRisque.filter((c) => c.risque === i).length }))
      .filter((p) => p.valeur > 0), entier, (p) => couleurRisque[p.index], "risque");

    const churnSi = (test) => tauxChurn(f.filter(test));
    const leviers = [
      { nom: "Engagement", cible: (c) => c.contrat === 0,
        constat: `${pct(churnSi((c) => c.contrat === 0))} sans engagement, ${pct(churnSi((c) => c.contrat === 2))} à 2 ans`,
        action: "Offre de passage à 12 mois avec un avantage" },
      { nom: "Accueil", cible: (c) => c.mois <= 12,
        constat: `${pct(churnSi((c) => c.anciennete === 0))} avant 12 mois, ${pct(churnSi((c) => c.anciennete === 3))} après 48 mois`,
        action: "Appel de bienvenue, point à 3 et 6 mois" },
      { nom: "Équipement", cible: (c) => c.services <= 3,
        constat: `${pct(churnSi((c) => c.services === 3))} à 3 services, ${pct(churnSi((c) => c.services >= 7))} à 7 services et plus`,
        action: "Offrir l'option sécurité ou support quelques mois" },
    ];
    $("#leviers").innerHTML = leviers.map((l) => {
      const cibles = m.eleve.filter(l.cible);
      return `<div class="levier">
        ${kpi({ titre: l.nom, valeur: entier(cibles.length), repere: montant(cibles.reduce((t, c) => t + c.charges, 0)),
          legende: "clients actifs à risque élevé ciblés · revenu par mois" })}
        <p class="levier__constat">${l.constat}</p>
        <p class="levier__action"><strong>Action :</strong> ${l.action}</p>
      </div>`;
    }).join("");
  }

  // ------------------------------------------------------------ 2. Par segment
  function parSegment() {
    const graphe = (id, dim, valeurs, trier, vertical) => {
      const base = filtrer(dim);
      const moyenne = tauxChurn(base);
      let points = churnPar(base, dim, valeurs);
      if (trier) points = points.sort((a, b) => b.valeur - a.valeur);
      const st = document.querySelector(`[data-moyenne="${dim}"]`);
      if (st) st.textContent = moyenneTexte(moyenne);
      (vertical ? barresV : barresH)(id, points, pct, auDessus(moyenne), dim);
    };
    graphe("g-anciennete", "anciennete", L.anciennete, false, true);
    graphe("g-internet", "internet", L.internet, true, true);
    graphe("g-paiement", "paiement", L.paiement, true, false);

    const f = filtrer();
    const moyenne = tauxChurn(f);
    const services = [];
    for (let n = 1; n <= 9; n++) {
      const g = f.filter((c) => c.services === n);
      if (g.length) services.push({ libelle: String(n), index: n, valeur: tauxChurn(g) });
    }
    barresV("g-services", services, pct, auDessus(moyenne));
  }

  // ------------------------------------------------------------ 3. Plan d'action
  const tri = { cle: "proba", sens: -1 };
  let affiches = 25;
  const CLES_TRI = {
    id: (c) => c.id, proba: (c) => c.proba, contrat: (c) => c.contrat, anciennete: (c) => c.mois,
    charges: (c) => c.charges, action: (c) => L.action[c.action],
  };
  const NOMS_TRI = { id: "code client", proba: "probabilité de départ", contrat: "contrat", anciennete: "ancienneté",
    charges: "charges", action: "action suggérée" };

  function listeAppels() {
    const cherche = $("#recherche").value.trim().toUpperCase();
    const cle = CLES_TRI[tri.cle];
    return mesures(filtrer()).eleve
      .filter((c) => !cherche || c.id.includes(cherche))
      .sort((a, b) => {
        const x = cle(a), y = cle(b);
        return (x < y ? -1 : x > y ? 1 : 0) * tri.sens || b.proba - a.proba;
      });
  }

  function plan() {
    const eleve = mesures(filtrer()).eleve;
    const moyenne = eleve.reduce((t, c) => t + c.proba, 0) / eleve.length;
    $("#kpis-plan").innerHTML = [
      kpi({ titre: "Clients à contacter", valeur: entier(eleve.length), legende: "Actifs avec une probabilité de départ ≥ 60 %" }),
      kpi({ titre: "Revenu mensuel en jeu", valeur: montant(eleve.reduce((t, c) => t + c.charges, 0)),
        legende: "Charges mensuelles des clients de la liste" }),
      kpi({ titre: "Probabilité moyenne de départ", valeur: pct(moyenne), legende: "À calibrer selon la capacité d'appel", style: "kpi--bleu" }),
    ].join("");

    const liste = listeAppels();
    const visibles = liste.slice(0, affiches);
    document.querySelectorAll("#t-liste th").forEach((th) => {
      const b = th.querySelector("button");
      th.setAttribute("aria-sort", b.dataset.tri === tri.cle ? (tri.sens < 0 ? "descending" : "ascending") : "none");
    });
    $("#t-liste tbody").innerHTML = visibles.length ? visibles.map((c) => `<tr>
        <td class="code">${c.id}</td>
        <td><div class="proba"><span class="proba__piste"><span class="proba__barre" style="width:${c.proba * 100}%"></span></span>
          <span class="proba__valeur">${pct(c.proba)}</span></div></td>
        <td>${L.contrat[c.contrat]}</td>
        <td>${L.anciennete[c.anciennete]}</td>
        <td class="num">${montant2(c.charges)}</td>
        <td>${echap(L.action[c.action])}</td>
      </tr>`).join("")
      : `<tr><td colspan="6">${$("#recherche").value ? "Aucun code client ne contient ce texte. Vérifiez la saisie ou effacez la recherche." : VIDE}</td></tr>`;
    $("#compte-liste").textContent = liste.length
      ? `${entier(visibles.length)} affichés sur ${entier(liste.length)} clients · triés par ${NOMS_TRI[tri.cle]}`
      : "Aucun client à appeler dans cette sélection";
    const plus = $("#plus");
    plus.disabled = visibles.length >= liste.length;
    plus.textContent = plus.disabled ? "Tous les clients sont affichés" : `Afficher ${Math.min(25, liste.length - visibles.length)} clients de plus`;
    $("#telecharger").disabled = !liste.length;
  }

  document.querySelectorAll("#t-liste th button").forEach((b) => b.addEventListener("click", () => {
    const cle = b.dataset.tri;
    tri.sens = tri.cle === cle ? -tri.sens : (cle === "proba" || cle === "charges" ? -1 : 1);
    tri.cle = cle;
    plan();
  }));
  $("#recherche").addEventListener("input", () => { affiches = 25; plan(); });
  $("#plus").addEventListener("click", () => { affiches += 25; plan(); });
  $("#telecharger").addEventListener("click", () => {
    const lignes = [["Client (pseudonyme)", "Probabilité de départ", "Contrat", "Ancienneté", "Charges mensuelles", "Action suggérée"]]
      .concat(listeAppels().map((c) => [c.id, String(c.proba).replace(".", ","), L.contrat[c.contrat], L.anciennete[c.anciennete],
        String(c.charges).replace(".", ","), L.action[c.action]]));
    const csv = "﻿" + lignes.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const lien = document.createElement("a");
    lien.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    lien.download = "liste-appels-fidelisation.csv";
    lien.click();
    URL.revokeObjectURL(lien.href);
  });

  // ------------------------------------------------------------ 4. Gouvernance (tables du traitement, hors filtres)
  function gouvernance() {
    const reussis = D.calculs.filter((c) => c.reussi).map((c) => c.fin).sort();
    const dernier = reussis[reussis.length - 1];
    const [jour, heure] = dernier.split(" ");
    const date = jour.split("-").reverse().join("/");
    const conformes = D.qualite.filter((q) => q.conforme).length;
    const pseudo = clients.filter((c) => c.id.startsWith("CL-")).length;
    const ratioMin = Math.min(...D.equite.map((e) => e.ratio));
    const axesAlerte = new Set(D.equite.filter((e) => !e.conforme).map((e) => e.axe)).size;
    $("#kpis-gouvernance").innerHTML = [
      kpi({ titre: "Dernier calcul réussi", valeur: date, repere: `à ${heure.slice(0, 5)}`,
        legende: "Données figées pour cette version web · recalcul chaque lundi (RG08)", style: "kpi--bleu kpi--date" }),
      kpi({ titre: "Contrôles de qualité réussis", valeur: pct(conformes / D.qualite.length),
        legende: `${D.qualite.length} règles · ${entier(Math.max(...D.qualite.map((q) => q.lignes)))} clients · bloquantes`, style: "kpi--bleu" }),
      kpi({ titre: "Clients pseudonymisés", valeur: entier(pseudo), repere: pct(pseudo / clients.length),
        legende: "HMAC-SHA256 · sans genre ni âge", style: "kpi--bleu" }),
      kpi({ titre: "Ratio de ciblage le plus bas", valeur: dec2(ratioMin), repere: "seuil 0,80",
        legende: `${axesAlerte} axe(s) sur 2 à arbitrer` }),
    ].join("");

    const axe = (nom) => D.equite.find((e) => e.axe === nom);
    const verdict = (e) => (e.conforme ? "conforme" : "à arbitrer");
    $("#bandeau-equite").textContent = `Genre : ratio ${dec2(axe("Genre").ratio)}, ${verdict(axe("Genre"))}. `
      + `Âge (65 ans et plus, seule donnée disponible) : ratio ${dec2(axe("Âge").ratio)}, écart de rappel `
      + `${fDec(1).format(axe("Âge").ecart_rappel)} points, ${verdict(axe("Âge"))}.`;

    const groupes = [...D.equite].sort((a, b) => a.groupe.localeCompare(b.groupe, "fr"));
    barresH("g-ciblage", [...D.equite].sort((a, b) => b.selection - a.selection)
      .map((e, i) => ({ libelle: e.groupe, index: i, valeur: e.selection, conforme: e.conforme })),
    pct, (p) => (p.conforme ? COULEURS.bleu : COULEURS.rouge));

    const statut = (ok, oui, non) => `<span class="${ok ? "conforme" : "alerte"}">${ok ? oui : non}</span>`;
    $("#t-equite").innerHTML = `<thead><tr><th scope="col">Groupe</th><th class="num" scope="col">Clients</th>
      <th class="num" scope="col">Churn réel</th><th class="num" scope="col">Ciblés</th><th class="num" scope="col">Rappel</th>
      <th class="num" scope="col">Faux pos.</th><th class="num" scope="col">Précision</th><th class="num" scope="col">Ratio</th>
      <th scope="col">Verdict</th></tr></thead><tbody>${groupes.map((e) => `<tr><td>${e.groupe}</td>
      <td class="num">${entier(e.clients)}</td><td class="num">${pct(e.churn)}</td><td class="num">${pct(e.selection)}</td>
      <td class="num">${pct(e.rappel)}</td><td class="num">${pct(e.faux_positifs)}</td><td class="num">${pct(e.precision)}</td>
      <td class="num">${dec2(e.ratio)}</td><td>${statut(e.conforme, "Conforme", "À arbitrer")}</td></tr>`).join("")}</tbody>`;

    $("#t-qualite").innerHTML = `<thead><tr><th scope="col">Règle</th><th scope="col">Contrôle</th>
      <th class="num" scope="col">Anomalies</th><th scope="col">Statut</th></tr></thead><tbody>${[...D.qualite]
      .sort((a, b) => a.regle.localeCompare(b.regle)).map((q) => `<tr><td>${q.regle}</td><td>${echap(q.controle)}</td>
      <td class="num">${entier(q.anomalies)}</td><td>${statut(q.conforme, "Conforme", "Non conforme")}</td></tr>`).join("")}</tbody>`;

    const horodate = (t) => `${t.slice(8, 10)}/${t.slice(5, 7)}/${t.slice(0, 4)} ${t.slice(11, 16)}`;
    $("#t-journal").innerHTML = `<thead><tr><th scope="col">Fin</th><th scope="col">Statut</th><th scope="col">Déclencheur</th>
      <th scope="col">Étape</th><th class="num" scope="col">Clients</th><th class="num" scope="col">Élevé</th></tr></thead><tbody>${[...D.calculs]
      .sort((a, b) => b.fin.localeCompare(a.fin)).map((c) => `<tr><td>${horodate(c.fin)}</td>
      <td>${statut(c.reussi, "Réussi", "Échec")}</td><td>${echap(c.declencheur)}</td><td>${echap(c.etape)}</td>
      <td class="num">${c.clients == null ? "–" : entier(c.clients)}</td><td class="num">${c.eleve == null ? "–" : entier(c.eleve)}</td></tr>`).join("")}</tbody>`;
  }

  // ------------------------------------------------------------ filtres (listes déroulantes à choix multiple)
  function construireFiltres() {
    document.querySelectorAll("[data-filtres]").forEach((zone, z) => {
      zone.innerHTML = zone.dataset.filtres.split(" ").map((dim) => {
        const id = `filtre-${z}-${dim}`;
        return `<div class="filtre" data-dim="${dim}">
          <span class="filtre__libelle" id="${id}-lib">${DIMENSIONS[dim].libelle}</span>
          <button type="button" class="filtre__bouton" aria-haspopup="true" aria-expanded="false" aria-controls="${id}"
            aria-labelledby="${id}-lib ${id}-val"><span id="${id}-val">Tout</span></button>
          <ul class="filtre__liste" id="${id}" hidden>${DIMENSIONS[dim].valeurs.map((v, i) => `<li><label>
            <input type="checkbox" value="${i}"> ${echap(v)}</label></li>`).join("")}</ul>
        </div>`;
      }).join("");
    });
    document.addEventListener("click", (e) => {
      const bouton = e.target.closest(".filtre__bouton");
      document.querySelectorAll(".filtre__bouton[aria-expanded=true]").forEach((b) => {
        if (b !== bouton) fermerFiltre(b);
      });
      if (bouton) {
        const ouvert = bouton.getAttribute("aria-expanded") === "true";
        bouton.setAttribute("aria-expanded", String(!ouvert));
        bouton.nextElementSibling.hidden = ouvert;
      }
    });
    document.addEventListener("change", (e) => {
      const caseFiltre = e.target.closest(".filtre__liste input");
      if (caseFiltre) basculer(caseFiltre.closest(".filtre").dataset.dim, Number(caseFiltre.value));
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const ouvert = document.querySelector(".filtre__bouton[aria-expanded=true]");
      if (ouvert) { fermerFiltre(ouvert); ouvert.focus(); }
    });
  }
  function fermerFiltre(b) { b.setAttribute("aria-expanded", "false"); b.nextElementSibling.hidden = true; }

  function majFiltres() {
    document.querySelectorAll(".filtre").forEach((f) => {
      const dim = f.dataset.dim;
      const s = selection[dim];
      f.querySelectorAll("input").forEach((i) => { i.checked = s.has(Number(i.value)); });
      f.querySelector(".filtre__bouton span").textContent = s.size === 0 ? "Tout"
        : s.size === 1 ? DIMENSIONS[dim].valeurs[[...s][0]] : `${s.size} valeurs`;
    });
    const puces = Object.entries(selection).flatMap(([dim, s]) => [...s].map((i) => `<li class="puce">
      ${DIMENSIONS[dim].libelle} : ${echap(DIMENSIONS[dim].valeurs[i])}
      <button type="button" data-retirer="${dim}" data-index="${i}" aria-label="Retirer ${echap(DIMENSIONS[dim].valeurs[i])}">×</button></li>`));
    $("#liste-selection").innerHTML = puces.join("");
    $("#barre-selection").hidden = puces.length === 0;
  }
  document.addEventListener("click", (e) => {
    const r = e.target.closest("[data-retirer]");
    if (r) basculer(r.dataset.retirer, Number(r.dataset.index));
  });
  $("#tout-effacer").addEventListener("click", () => {
    Object.values(selection).forEach((s) => s.clear());
    toutAfficher();
  });

  // ------------------------------------------------------------ onglets
  const PAGES = ["synthese", "segment", "plan", "gouvernance"];
  function ouvrirPage(page, focus) {
    if (!PAGES.includes(page)) page = "synthese";
    PAGES.forEach((p) => {
      const actif = p === page;
      const onglet = document.getElementById(`onglet-${p}`);
      onglet.setAttribute("aria-selected", String(actif));
      onglet.tabIndex = actif ? 0 : -1;
      const section = document.getElementById(`page-${p}`);
      if (actif && section.hidden) {
        section.hidden = false;
        // Fondu uniquement au changement d'onglet, pas au premier affichage
        section.classList.remove("entree");
        void section.offsetWidth;
        if (pageOuverte) section.classList.add("entree");
      } else if (!actif) section.hidden = true;
    });
    if (focus) document.getElementById(`onglet-${page}`).focus();
    pageOuverte = page;
  }
  let pageOuverte = null;
  document.querySelectorAll(".onglets button").forEach((b) => {
    b.addEventListener("click", () => { history.replaceState(null, "", `#${b.dataset.page}`); ouvrirPage(b.dataset.page); });
    b.addEventListener("keydown", (e) => {
      const i = PAGES.indexOf(b.dataset.page);
      const cible = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: PAGES.length - 1 }[e.key];
      if (cible === undefined) return;
      e.preventDefault();
      const page = PAGES[(cible + PAGES.length) % PAGES.length];
      history.replaceState(null, "", `#${page}`);
      ouvrirPage(page, true);
    });
  });
  window.addEventListener("hashchange", () => ouvrirPage(location.hash.slice(1)));

  // ------------------------------------------------------------ comparaison Power BI / Qlik Sense
  const NOMS_PAGES = { synthese: "Synthèse", "par-segment": "Par segment", "plan-action": "Plan d'action", gouvernance: "Gouvernance" };
  const dialogue = $("#comparaison");
  document.querySelectorAll("[data-comparer]").forEach((b) => b.addEventListener("click", () => {
    const nom = b.dataset.comparer;
    const img = $("#comparaison-image");
    img.src = `img/comparaison-${nom}.webp`;
    img.alt = `Page ${NOMS_PAGES[nom]} dans Power BI, au-dessus de la même feuille dans Qlik Sense`;
    $("#comparaison-titre").textContent = `${NOMS_PAGES[nom]} : Power BI en haut, Qlik Sense en bas`;
    dialogue.showModal();
  }));
  $("#fermer-comparaison").addEventListener("click", () => dialogue.close());
  dialogue.addEventListener("click", (e) => { if (e.target === dialogue) dialogue.close(); });

  // ------------------------------------------------------------ rendu
  function toutAfficher() {
    affiches = 25;
    majFiltres();
    synthese();
    parSegment();
    plan();
  }

  construireFiltres();
  gouvernance();
  toutAfficher();
  ouvrirPage(location.hash.slice(1));
})();
