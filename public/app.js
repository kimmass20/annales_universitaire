class ApplicationAnnales {
  constructor() {
    this.page = 1;
    this.liste = document.querySelector("#liste");
    this.resume = document.querySelector("#resume");
    this.pages = document.querySelector("#pages");
    document.querySelector("#filtres").addEventListener("submit", (e) => {
      e.preventDefault();
      this.page = 1;
      this.charger();
    });
  }

  async demarrer() {
    const meta = await (await fetch("/api/meta")).json();
    this.remplir("faculte", meta.facultes);
    this.remplir("annee", meta.annees);
    this.remplir("matiere", meta.matieres);
    await this.charger();
  }

  remplir(id, valeurs) {
    const select = document.querySelector("#" + id);
    for (const valeur of valeurs) {
      const option = document.createElement("option");
      option.value = valeur;
      option.textContent = valeur;
      select.appendChild(option);
    }
  }

  parametres() {
    const p = new URLSearchParams();
    p.set("page", String(this.page));
    const q = document.querySelector("#q").value.trim();
    const faculte = document.querySelector("#faculte").value;
    const annee = document.querySelector("#annee").value;
    const matiere = document.querySelector("#matiere").value;
    if (q) p.set("q", q);
    if (faculte) p.set("faculte", faculte);
    if (annee) p.set("annee_academique", annee);
    if (matiere) p.set("matiere", matiere);
    if (q === "Maths L1") p.set("mesurer", "1");
    return p;
  }

  async charger() {
    const data = await (await fetch("/api/annales?" + this.parametres())).json();
    this.resume.textContent = `${data.total} annale(s) — page ${data.page} / ${data.pages}`;
    this.liste.replaceChildren();
    for (const annale of data.resultats) this.liste.appendChild(this.carte(annale));
    this.afficherPages(data);
  }

  afficherPages(data) {
    this.pages.replaceChildren();
    const prec = document.createElement("button");
    prec.type = "button";
    prec.textContent = "Page précédente";
    prec.disabled = data.page <= 1;
    prec.onclick = () => { this.page -= 1; this.charger(); };
    const suiv = document.createElement("button");
    suiv.type = "button";
    suiv.textContent = "Page suivante";
    suiv.disabled = data.page >= data.pages;
    suiv.onclick = () => { this.page += 1; this.charger(); };
    this.pages.append(prec, document.createTextNode(` ${data.page} / ${data.pages} `), suiv);
  }

  carte(annale) {
    const li = document.createElement("li");
    const titre = document.createElement("strong");
    titre.textContent = annale.titre;
    const meta = document.createElement("p");
    meta.textContent = `${annale.faculte} · ${annale.annee_academique} · ${annale.matiere} · ${annale.type} · ${annale.taille_octets} octets`;
    const actions = document.createElement("div");
    actions.className = "actions";
    const dl = document.createElement("button");
    dl.type = "button";
    dl.textContent = annale.est_telecharge ? "Déjà téléchargée" : "Télécharger";
    dl.disabled = annale.est_telecharge;
    dl.onclick = () => this.telecharger(annale.id);
    const lire = document.createElement("button");
    lire.type = "button";
    lire.textContent = "Lire hors-ligne";
    lire.disabled = !annale.est_telecharge;
    lire.onclick = () => this.lireHorsLigne(annale);
    const fav = document.createElement("button");
    fav.type = "button";
    fav.textContent = annale.est_favori ? "Retirer des favoris" : "Ajouter aux favoris";
    fav.onclick = () => this.basculerFavori(annale.id);
    actions.append(dl, lire, fav);
    li.append(titre, meta, actions);
    return li;
  }

  async telecharger(id) {
    const r = await fetch(`/api/annales/${id}/telecharger`, { method: "POST" });
    if (r.ok) await this.charger();
  }

  async lireHorsLigne(annale) {
    const r = await fetch(`/api/annales/${annale.id}/lecture`);
    if (!r.ok) return;
    const blob = await r.blob();
    const cadre = document.querySelector("#lecteur-cadre");
    if (cadre.src.startsWith("blob:")) URL.revokeObjectURL(cadre.src);
    document.querySelector("#lecteur").hidden = false;
    document.querySelector("#lecteur-titre").textContent = annale.titre;
    document.querySelector("#lecteur-meta").textContent = "Lu depuis le fichier enregistré sur cet ordinateur.";
    cadre.src = URL.createObjectURL(blob);
  }

  async basculerFavori(id) {
    const r = await fetch(`/api/annales/${id}/favori`, { method: "POST" });
    if (r.ok) await this.charger();
  }
}

new ApplicationAnnales().demarrer();
