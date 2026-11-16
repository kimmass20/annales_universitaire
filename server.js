const fs = require("fs");
const http = require("http");
const path = require("path");
const { BaseAnnales } = require("./lib/db");
const { GenerateurAnnales } = require("./lib/dataset");
const { JournalMesures } = require("./lib/mesures");

class ServeurAnnales {
  constructor() {
    this.port = Number(process.env.PORT) || 3080;
    this.publicDir = path.join(__dirname, "public");
    this.journal = new JournalMesures();
    this.journal.ecrire("demarrage_debut");
    this.base = new BaseAnnales();
    this.telecharges = path.join(this.base.dossier, "telecharges");
    fs.mkdirSync(this.telecharges, { recursive: true });
    this.types = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
    };
  }

  cheminLocal(id) {
    return path.join(this.telecharges, `${id}.pdf`);
  }

  envoyer(res, code, corps, type) {
    const buf = Buffer.isBuffer(corps) ? corps : Buffer.from(corps);
    res.writeHead(code, {
      "Content-Type": type || "application/json; charset=utf-8",
      "Content-Length": buf.length,
      "Cache-Control": "no-store",
    });
    res.end(buf);
  }

  repondreMeta(res) {
    this.envoyer(res, 200, JSON.stringify({
      total: this.base.compter(),
      facultes: this.base.valeursDistinctes("faculte"),
      annees: this.base.valeursDistinctes("annee_academique"),
      matieres: this.base.valeursDistinctes("matiere"),
    }));
  }

  repondreListe(res, url) {
    const q = (url.searchParams.get("q") || "").trim();
    const mesurer = q && url.searchParams.get("mesurer") === "1";
    if (mesurer) this.journal.ecrire("recherche_debut");
    const page = this.base.rechercher({
      page: Math.max(1, Number(url.searchParams.get("page")) || 1),
      faculte: url.searchParams.get("faculte") || "",
      annee_academique: url.searchParams.get("annee_academique") || "",
      matiere: url.searchParams.get("matiere") || "",
      q,
    });
    if (mesurer) this.journal.ecrire("recherche_fin");
    this.envoyer(res, 200, JSON.stringify({
      ...page,
      resultats: page.resultats.map((a) => a.versJson()),
    }));
  }

  repondreLecture(res, id) {
    const annale = this.base.trouver(id);
    if (!annale) return this.envoyer(res, 404, JSON.stringify({ erreur: "Annale introuvable." }));
    const fichier = this.cheminLocal(id);
    if (!annale.est_telecharge || !fs.existsSync(fichier)) {
      return this.envoyer(res, 409, JSON.stringify({ erreur: "Annale non téléchargée." }));
    }
    const corps = fs.readFileSync(fichier);
    this.journal.ecrire("lecture_hors_ligne_fin");
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Length": corps.length,
      "Cache-Control": "no-store",
    });
    res.end(corps);
  }

  repondreTelechargement(res, id) {
    const annale = this.base.trouver(id);
    if (!annale) return this.envoyer(res, 404, JSON.stringify({ erreur: "Annale introuvable." }));
    this.journal.ecrire("telechargement_debut");
    fs.writeFileSync(this.cheminLocal(id), GenerateurAnnales.contenuFichier(annale));
    const maj = this.base.marquerTelechargee(id);
    this.journal.ecrire("telechargement_fin");
    this.envoyer(res, 200, JSON.stringify(maj.versJson()));
  }

  repondreFavori(res, id) {
    const maj = this.base.basculerFavori(id);
    if (!maj) return this.envoyer(res, 404, JSON.stringify({ erreur: "Annale introuvable." }));
    this.envoyer(res, 200, JSON.stringify(maj.versJson()));
  }

  repondreFichier(res, pathname) {
    const relatif = pathname === "/" ? "index.html" : pathname.slice(1);
    const fichier = path.normalize(path.join(this.publicDir, relatif));
    if (!fichier.startsWith(this.publicDir) || !fs.existsSync(fichier) || !fs.statSync(fichier).isFile()) {
      return this.envoyer(res, 404, JSON.stringify({ erreur: "Introuvable." }));
    }
    const ext = path.extname(fichier);
    this.envoyer(res, 200, fs.readFileSync(fichier), this.types[ext] || "application/octet-stream");
  }

  traiter(req, res) {
    const url = new URL(req.url, `http://127.0.0.1:${this.port}`);
    if (req.method === "GET" && url.pathname === "/api/meta") return this.repondreMeta(res);
    if (req.method === "GET" && url.pathname === "/api/annales") return this.repondreListe(res, url);
    const lecture = url.pathname.match(/^\/api\/annales\/(ann-\d+)\/lecture$/);
    if (req.method === "GET" && lecture) return this.repondreLecture(res, lecture[1]);
    const telechargement = url.pathname.match(/^\/api\/annales\/(ann-\d+)\/telecharger$/);
    if (req.method === "POST" && telechargement) return this.repondreTelechargement(res, telechargement[1]);
    const favori = url.pathname.match(/^\/api\/annales\/(ann-\d+)\/favori$/);
    if (req.method === "POST" && favori) return this.repondreFavori(res, favori[1]);
    if (req.method === "GET") return this.repondreFichier(res, url.pathname);
    this.envoyer(res, 405, JSON.stringify({ erreur: "Méthode refusée." }));
  }

  demarrer() {
    const serveur = http.createServer((req, res) => {
      try {
        this.traiter(req, res);
      } catch (e) {
        this.envoyer(res, 500, JSON.stringify({ erreur: "Erreur serveur." }));
      }
    });
    serveur.listen(this.port, "127.0.0.1", () => {
      this.journal.ecrire("demarrage_fin");
      console.log(`Annales & Révisions — ${this.base.compter()} annales — http://127.0.0.1:${this.port}`);
    });
  }
}

new ServeurAnnales().demarrer();
