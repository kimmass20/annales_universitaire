const fs = require("fs");
const path = require("path");

class JournalMesures {
  constructor() {
    this.fichier = path.join(__dirname, "..", "mesures.csv");
    this.actives = process.env.MESURES_ACTIVEES === "true";
  }

  ecrire(evenement) {
    if (!this.actives) return;
    if (!fs.existsSync(this.fichier)) {
      fs.writeFileSync(this.fichier, "evenement,timestamp_ms\n");
    }
    fs.appendFileSync(this.fichier, `${evenement},${Date.now()}\n`);
  }
}

module.exports = { JournalMesures };
