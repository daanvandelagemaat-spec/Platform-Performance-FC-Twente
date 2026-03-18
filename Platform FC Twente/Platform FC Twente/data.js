window.platformSeed = {
  users: [
    {
      id: "user-admin",
      name: "Performance Admin",
      email: "admin@fctwente.nl",
      password: "TwenteAdmin!",
      role: "admin"
    },
    {
      id: "user-editor",
      name: "Head of Performance",
      email: "performance@fctwente.nl",
      password: "TwenteCoach!",
      role: "editor"
    },
    {
      id: "user-viewer",
      name: "Data Analist",
      email: "analist@fctwente.nl",
      password: "TwenteView!",
      role: "viewer"
    }
  ],
  articles: [],
  knowledge: [
    {
      id: "knowledge-1",
      type: "knowledge",
      title: "Wedstrijddag - monitoring workflow",
      owner: "Performance Analist",
      theme: "Load Monitoring",
      status: "Actief",
      summary: "Beschrijving van de workflow voor het verzamelen en valideren van GPS, wellness en RPE data op wedstrijddagen.",
      practical: "Controleer dat de datacontrole uiterlijk 90 minuten na de training afgerond is, zodat stafbriefing dezelfde dag mogelijk blijft.",
      createdBy: "Performance Admin",
      tags: ["workflow", "matchday", "gps"]
    },
    {
      id: "knowledge-2",
      type: "knowledge",
      title: "Herstelprotocol na uitwedstrijd",
      owner: "Head of Performance",
      theme: "Herstel",
      status: "Actief",
      summary: "Interne afspraken over cooldown, voeding, slaap en ochtendmonitoring na late uitwedstrijden.",
      practical: "Gebruik dit protocol als standaard sjabloon en noteer afwijkingen wanneer reistijd of speeltijd daar aanleiding toe geven.",
      createdBy: "Head of Performance",
      tags: ["protocol", "recovery", "travel"]
    },
    {
      id: "knowledge-3",
      type: "knowledge",
      title: "Sprint exposure tijdens revalidatie",
      owner: "Fysio Performance",
      theme: "Return To Play",
      status: "Review nodig",
      summary: "Praktijknotities over opbouw van high-speed running en sprintbelasting in de laatste fase van revalidatie.",
      practical: "Werk met drempelwaardes per speler en stem de sprintopbouw iedere 48 uur af met medical en performance.",
      createdBy: "Head of Performance",
      tags: ["rehab", "hsr", "sprint"]
    }
  ],
  documents: []
};
