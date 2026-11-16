/**
 * Scénario commun, contre un serveur déjà lancé.
 * [HYPOTHÈSE] L'étape « couper le réseau » n'est pas faite par ce script.
 */
class ScenarioMesure {
  constructor(base) {
    this.base = base;
  }

  async lireJson(chemin) {
    const r = await fetch(this.base + chemin);
    if (!r.ok) throw new Error(`${chemin} -> ${r.status}`);
    return r.json();
  }

  async executer() {
    const recherche = await this.lireJson("/api/annales?q=Maths%20L1&mesurer=1&page=1");
    const filtre = await this.lireJson("/api/annales?q=Maths%20L1&faculte=Informatique&page=1");
    const ids = filtre.resultats.slice(0, 10).map((a) => a.id);
    if (ids.length < 10) throw new Error(`Seulement ${ids.length} annales pour le téléchargement.`);
    for (const id of ids) {
      const r = await fetch(`${this.base}/api/annales/${id}/telecharger`, { method: "POST" });
      if (!r.ok) throw new Error(`Téléchargement ${id} -> ${r.status}`);
    }
    for (const id of ids.slice(0, 5)) {
      const r = await fetch(`${this.base}/api/annales/${id}/lecture`);
      if (!r.ok) throw new Error(`Lecture ${id} -> ${r.status}`);
      await r.arrayBuffer();
    }
    for (const id of ids.slice(0, 3)) {
      const r = await fetch(`${this.base}/api/annales/${id}/favori`, { method: "POST" });
      if (!r.ok) throw new Error(`Favori ${id} -> ${r.status}`);
    }
    console.log(`Recherche Maths L1 : ${recherche.total}`);
    console.log(`Après filtre Informatique : ${filtre.total}`);
    console.log(`Téléchargées : ${ids.length}, lues : 5, favoris ajoutés : 3`);
  }
}

new ScenarioMesure(process.env.BASE_URL || "http://127.0.0.1:3080").executer().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
