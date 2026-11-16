const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const { Annale, GenerateurAnnales } = require("./dataset");

class BaseAnnales {
  constructor() {
    this.dossier = path.join(__dirname, "..", "data");
    this.chemin = path.join(this.dossier, "annales.db");
    fs.mkdirSync(this.dossier, { recursive: true });
    this.db = new DatabaseSync(this.chemin);
    this.creerTables();
    this.chargerJeuSiBesoin();
  }

  creerTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS meta (
        cle TEXT PRIMARY KEY,
        valeur TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS annales (
        id TEXT PRIMARY KEY,
        titre TEXT NOT NULL,
        faculte TEXT NOT NULL,
        annee_academique TEXT NOT NULL,
        matiere TEXT NOT NULL,
        type TEXT NOT NULL,
        taille_octets INTEGER NOT NULL,
        url_fichier TEXT NOT NULL,
        est_telecharge INTEGER NOT NULL DEFAULT 0,
        est_favori INTEGER NOT NULL DEFAULT 0
      );
    `);
  }

  chargerJeuSiBesoin() {
    const attendu = `${GenerateurAnnales.GRAINE}-${GenerateurAnnales.NOMBRE}`;
    const version = this.db.prepare("SELECT valeur FROM meta WHERE cle = 'jeu'").get();
    if (version && version.valeur === attendu) return;
    const annales = GenerateurAnnales.generer();
    this.db.exec("BEGIN");
    this.db.exec("DELETE FROM annales");
    const insert = this.db.prepare(`
      INSERT INTO annales (
        id, titre, faculte, annee_academique, matiere, type,
        taille_octets, url_fichier, est_telecharge, est_favori
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
    `);
    for (const a of annales) {
      insert.run(a.id, a.titre, a.faculte, a.annee_academique, a.matiere, a.type, a.taille_octets, a.url_fichier);
    }
    this.db.prepare(`
      INSERT INTO meta (cle, valeur) VALUES ('jeu', ?)
      ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur
    `).run(attendu);
    this.db.exec("COMMIT");
  }

  compter() {
    return this.db.prepare("SELECT COUNT(*) AS n FROM annales").get().n;
  }

  valeursDistinctes(colonne) {
    const autorisees = ["faculte", "annee_academique", "matiere"];
    if (!autorisees.includes(colonne)) throw new Error("Colonne refusée.");
    return this.db.prepare(`SELECT DISTINCT ${colonne} AS v FROM annales ORDER BY ${colonne}`).all().map((r) => r.v);
  }

  rechercher(critere) {
    const where = [];
    const params = [];
    if (critere.faculte) {
      where.push("faculte = ?");
      params.push(critere.faculte);
    }
    if (critere.annee_academique) {
      where.push("annee_academique = ?");
      params.push(critere.annee_academique);
    }
    if (critere.matiere) {
      where.push("matiere = ?");
      params.push(critere.matiere);
    }
    if (critere.q) {
      where.push("(titre LIKE ? OR matiere LIKE ?)");
      params.push(`%${critere.q}%`, `%${critere.q}%`);
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const limite = 20;
    const page = critere.page;
    const total = this.db.prepare(`SELECT COUNT(*) AS n FROM annales ${clause}`).get(...params).n;
    const rows = this.db.prepare(`
      SELECT * FROM annales ${clause}
      ORDER BY annee_academique DESC, matiere, id
      LIMIT ? OFFSET ?
    `).all(...params, limite, (page - 1) * limite);
    return {
      page,
      limite,
      total,
      pages: Math.max(1, Math.ceil(total / limite)),
      resultats: rows.map((row) => Annale.depuisLigne(row)),
    };
  }

  trouver(id) {
    const row = this.db.prepare("SELECT * FROM annales WHERE id = ?").get(id);
    return row ? Annale.depuisLigne(row) : null;
  }

  marquerTelechargee(id) {
    this.db.prepare("UPDATE annales SET est_telecharge = 1 WHERE id = ?").run(id);
    return this.trouver(id);
  }

  basculerFavori(id) {
    const annale = this.trouver(id);
    if (!annale) return null;
    this.db.prepare("UPDATE annales SET est_favori = ? WHERE id = ?").run(annale.est_favori ? 0 : 1, id);
    return this.trouver(id);
  }
}

module.exports = { BaseAnnales };
