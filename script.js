const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

function resizeGameScreen() {
  const screen = document.getElementById("gameScreen");
  const content = document.getElementById("gameContent");

  const windowRatio = window.innerWidth / window.innerHeight;
  const targetRatio = 16 / 9;

  if (windowRatio > targetRatio) {
    screen.style.height = "100vh";
    screen.style.width = "calc(100vh * 16 / 9)";
  } else {
    screen.style.width = "100vw";
    screen.style.height = "calc(100vw * 9 / 16)";
  }

  if (!content) {
    return;
  }

  const screenRect = screen.getBoundingClientRect();
  const screenWidth = screen.clientWidth || screenRect.width;
  const screenHeight = screen.clientHeight || screenRect.height;

  if (!screenWidth || !screenHeight) {
    return;
  }

  const scale = Math.min(
    screenWidth / DESIGN_WIDTH,
    screenHeight / DESIGN_HEIGHT
  );
  const left = (screenWidth - DESIGN_WIDTH * scale) / 2;
  const top = (screenHeight - DESIGN_HEIGHT * scale) / 2;

  content.style.left = `${left}px`;
  content.style.top = `${top}px`;
  content.style.transform = `scale(${scale})`;
}

window.addEventListener("resize", resizeGameScreen);
window.addEventListener("orientationchange", resizeGameScreen);

const STORAGE_KEY = "valeria-rebuild-saves";
const BASE_POINTS_TO_PLACE = 10;
const MAX_TEAM_SIZE = 6;

const CLASSES = [
  {
    id: "epeiste",
    name: "Épéiste",
    emoji: "⚔️",
    description: "Combattant équilibré spécialisé dans les dégâts physiques.",
    statBonuses: {},
    spells: []
  },
  {
    id: "mage",
    name: "Mage",
    emoji: "🔮",
    description: "Utilisateur de mana capable d’infliger de puissants dégâts magiques.",
    statBonuses: {},
    spells: []
  },
  {
    id: "assassin",
    name: "Assassin",
    emoji: "🗡️",
    description: "Combattant rapide misant sur le critique et l’esquive.",
    statBonuses: {},
    spells: []
  },
  {
    id: "tank",
    name: "Tank",
    emoji: "🛡️",
    description: "Défenseur robuste capable d’encaisser les coups.",
    statBonuses: {},
    spells: []
  },
  {
    id: "sorcier",
    name: "Sorcier",
    emoji: "💀",
    description: "Lanceur de sorts offensifs aux pouvoirs instables.",
    statBonuses: {},
    spells: []
  },
  {
    id: "guerisseur",
    name: "Guérisseur",
    emoji: "✨",
    description: "Soutien magique spécialisé dans la survie de l’équipe.",
    statBonuses: {},
    spells: []
  }
];

const BASE_STATS = {
  force: "FORCE",
  speed: "RAPIDITÉ",
  constitution: "CONSTITUTION",
  mana: "MANA"
};

const gameState = {
  screen: "saves",
  saves: [],
  selectedSaveId: null,
  currentSaveId: null,
  team: [],
  selectedCharacterId: null,
  inventory: [],
  gold: 0,
  logs: [],
  selectedInventoryItemId: null,
  selectedEquipmentSlot: null,
  activePopup: null,
  merchantMode: "buy",
  merchantMessage: null,
  tavernMode: "menu",
  tavernMessage: null,
  restRemainingSeconds: 60
};

let creationDraft = getInitialCreationDraft();
let tavernRestTimerId = null;

function getInitialCreationDraft() {
  return {
    pseudo: "",
    classId: CLASSES[0].id,
    baseStats: {
      force: 1,
      speed: 1,
      constitution: 1,
      mana: 1
    }
  };
}

function getGameScreen() {
  return document.getElementById("gameScreen");
}

function getGameContent() {
  return document.getElementById("gameContent");
}

function getClassById(classId) {
  return CLASSES.find((characterClass) => characterClass.id === classId) || CLASSES[0];
}

function getSelectedCharacter() {
  return gameState.team.find((character) => character.id === gameState.selectedCharacterId) || null;
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function calculateDerivedStats(baseStats, level) {
  return {
    physicalPower: 50 + 5 * (level - 1) + 7 * (baseStats.force - 1),
    defense: 50 + 5 * (level - 1) + 7 * (baseStats.constitution - 1),
    magicPower: 50 + 5 * (level - 1) + 7 * (baseStats.mana - 1),
    crit: Math.min(50, 5 + 2 * (baseStats.speed - 1)),
    dodge: Math.min(35, Math.floor(3 + 1.5 * (baseStats.speed - 1))),
    maxHp: 100 + 10 * (level - 1) + 12 * (baseStats.constitution - 1),
    maxEnergy: 100 + 10 * (level - 1) + 12 * (baseStats.mana - 1)
  };
}

function getEmptyFinalStats() {
  return {
    physicalPower: 0,
    defense: 0,
    magicPower: 0,
    crit: 0,
    dodge: 0,
    maxHp: 0,
    maxEnergy: 0
  };
}

function getEquipmentBonuses(character) {
  const bonuses = getEmptyFinalStats();
  const equippedItems = [
    character.equipment?.arme,
    character.equipment?.armure
  ].filter(Boolean);

  equippedItems.forEach((item) => {
    Object.entries(item.stats || {}).forEach(([statKey, value]) => {
      if (statKey in bonuses) {
        bonuses[statKey] += value;
      }
    });
  });

  return bonuses;
}

function getFinalCharacterStats(character) {
  const derivedStats = character.derivedStats || getEmptyFinalStats();
  const equipmentBonuses = getEquipmentBonuses(character);

  return {
    physicalPower: derivedStats.physicalPower + equipmentBonuses.physicalPower,
    defense: derivedStats.defense + equipmentBonuses.defense,
    magicPower: derivedStats.magicPower + equipmentBonuses.magicPower,
    crit: Math.min(50, derivedStats.crit + equipmentBonuses.crit),
    dodge: Math.min(35, derivedStats.dodge + equipmentBonuses.dodge),
    maxHp: derivedStats.maxHp + equipmentBonuses.maxHp,
    maxEnergy: derivedStats.maxEnergy + equipmentBonuses.maxEnergy
  };
}

function clampCharacterCurrentVitals(character) {
  const finalStats = getFinalCharacterStats(character);
  character.hp = Math.min(character.hp, finalStats.maxHp);
  character.energy = Math.min(character.energy, finalStats.maxEnergy);
}

function createCharacter(pseudo, classId, baseStats) {
  const characterClass = getClassById(classId);
  const level = 1;
  const derivedStats = calculateDerivedStats(baseStats, level);

  return {
    id: createId("character"),
    pseudo,
    classId,
    emoji: characterClass.emoji,
    level,
    exp: 0,
    expToNext: 100,
    baseStats: { ...baseStats },
    derivedStats,
    hp: derivedStats.maxHp,
    maxHp: derivedStats.maxHp,
    energy: derivedStats.maxEnergy,
    maxEnergy: derivedStats.maxEnergy,
    equipment: {
      arme: null,
      armure: null
    }
  };
}

const ITEM_DATABASE = {
  consumables: [
    {
      id: "consumable_potion_de_vie",
      name: "Potion de vie",
      emoji: "🧪",
      type: "consumable",
      effectType: "restoreHpPercent",
      effectValue: 30,
      effectText: "Restaure 30% des PV max",
      buyPrice: 30,
      sellPrice: 15,
      description: "Potion simple qui referme les blessures selon les PV max."
    },
    {
      id: "consumable_potion_energie",
      name: "Potion d’énergie",
      emoji: "🔵",
      type: "consumable",
      effectType: "restoreEnergyPercent",
      effectValue: 30,
      effectText: "Restaure 30% des PE max",
      buyPrice: 30,
      sellPrice: 15,
      description: "Potion simple qui rend de l’énergie selon les PE max."
    }
  ],
  weapons: [
    {
      id: "weapon_dague_en_os_1",
      name: "Dague en os",
      emoji: "🗡️",
      type: "weapon",
      level: 1,
      stats: { physicalPower: 8, crit: 3 },
      statsText: "+8 PP, +3% CRIT",
      materials: [
        { name: "Os de monstre", quantity: 2 },
        { name: "Croc de loup", quantity: 1 }
      ],
      normalPrice: 80,
      reducedPrice: 40,
      sellPrice: 20,
      description: "Une lame légère taillée dans un os durci."
    },
    {
      id: "weapon_epee_de_ferraille_1",
      name: "Épée de ferraille",
      emoji: "⚔️",
      type: "weapon",
      level: 1,
      stats: { physicalPower: 10, defense: 5 },
      statsText: "+10 PP, +5 DEF",
      materials: [
        { name: "Morceau de ferraille", quantity: 3 },
        { name: "Bois solide", quantity: 1 }
      ],
      normalPrice: 90,
      reducedPrice: 45,
      sellPrice: 22,
      description: "Une épée grossière, mais assez solide pour survivre."
    },
    {
      id: "weapon_bouclier_en_bois_1",
      name: "Bouclier en bois",
      emoji: "🛡️",
      type: "weapon",
      level: 1,
      stats: { defense: 8, maxHp: 25 },
      statsText: "+8 DEF, +25 PV max",
      materials: [
        { name: "Bois solide", quantity: 3 },
        { name: "Peau de sanglier", quantity: 1 }
      ],
      normalPrice: 90,
      reducedPrice: 45,
      sellPrice: 22,
      description: "Un bouclier simple pour encaisser les premiers coups."
    },
    {
      id: "weapon_baton_de_bois_1",
      name: "Bâton de bois",
      emoji: "🪄",
      type: "weapon",
      level: 1,
      stats: { magicPower: 10, maxEnergy: 25 },
      statsText: "+10 PM, +25 PE max",
      materials: [
        { name: "Bois solide", quantity: 2 },
        { name: "Noyau de slime", quantity: 1 }
      ],
      normalPrice: 90,
      reducedPrice: 45,
      sellPrice: 22,
      description: "Un bâton conducteur pour les premiers sorts."
    },
    {
      id: "weapon_grimoire_use_1",
      name: "Grimoire usé",
      emoji: "📖",
      type: "weapon",
      level: 1,
      stats: { magicPower: 10, crit: 3 },
      statsText: "+10 PM, +3% CRIT",
      materials: [
        { name: "Peau de sanglier", quantity: 1 },
        { name: "Venin d’araignée", quantity: 1 },
        { name: "Soie d’araignée", quantity: 1 }
      ],
      normalPrice: 100,
      reducedPrice: 50,
      sellPrice: 25,
      description: "Un vieux grimoire encore chargé d’une magie instable."
    }
  ],
  armors: [
    {
      id: "armor_armure_legere_1",
      name: "Armure légère",
      emoji: "🦺",
      type: "armor",
      level: 1,
      stats: { defense: 6, dodge: 3 },
      statsText: "+6 DEF, +3% ESQ",
      materials: [
        { name: "Peau de sanglier", quantity: 2 },
        { name: "Fourrure de loup", quantity: 1 }
      ],
      normalPrice: 80,
      reducedPrice: 40,
      sellPrice: 20,
      description: "Une protection souple qui laisse de la mobilité."
    },
    {
      id: "armor_armure_lourde_1",
      name: "Armure lourde",
      emoji: "🛡️",
      type: "armor",
      level: 1,
      stats: { defense: 10, maxHp: 30 },
      statsText: "+10 DEF, +30 PV max",
      materials: [
        { name: "Morceau de ferraille", quantity: 3 },
        { name: "Défense de sanglier", quantity: 1 }
      ],
      normalPrice: 100,
      reducedPrice: 50,
      sellPrice: 25,
      description: "Une armure rudimentaire, lourde mais rassurante."
    },
    {
      id: "armor_robe_magique_1",
      name: "Robe magique",
      emoji: "🧥",
      type: "armor",
      level: 1,
      stats: { defense: 6, maxEnergy: 30 },
      statsText: "+6 DEF, +30 PE max",
      materials: [
        { name: "Soie d’araignée", quantity: 2 },
        { name: "Noyau de slime", quantity: 1 }
      ],
      normalPrice: 100,
      reducedPrice: 50,
      sellPrice: 25,
      description: "Une robe légère cousue avec des fibres réactives à la mana."
    },
    {
      id: "armor_tunique_1",
      name: "Tunique",
      emoji: "👕",
      type: "armor",
      level: 1,
      stats: { maxHp: 25, maxEnergy: 25 },
      statsText: "+25 PV max, +25 PE max",
      materials: [
        { name: "Fourrure de loup", quantity: 2 },
        { name: "Peau de sanglier", quantity: 1 }
      ],
      normalPrice: 90,
      reducedPrice: 45,
      sellPrice: 22,
      description: "Une tunique de voyage renforcée avec des peaux épaisses."
    }
  ],
  resources: [
    { id: "resource_gelee_de_slime", name: "Gelée de slime", emoji: "🟢", type: "resource", sellPrice: 2, description: "Ressource de forêt destinée à la vente ou à la fabrication." },
    { id: "resource_noyau_de_slime", name: "Noyau de slime", emoji: "🟢", type: "resource", sellPrice: 5, description: "Ressource de forêt destinée à la vente ou à la fabrication." },
    { id: "resource_griffe_de_loup", name: "Griffe de loup", emoji: "🐺", type: "resource", sellPrice: 3, description: "Ressource de forêt destinée à la vente ou à la fabrication." },
    { id: "resource_croc_de_loup", name: "Croc de loup", emoji: "🦷", type: "resource", sellPrice: 5, description: "Ressource de forêt destinée à la vente ou à la fabrication." },
    { id: "resource_fourrure_de_loup", name: "Fourrure de loup", emoji: "🐺", type: "resource", sellPrice: 6, description: "Ressource de forêt destinée à la vente ou à la fabrication." },
    { id: "resource_peau_de_sanglier", name: "Peau de sanglier", emoji: "🐗", type: "resource", sellPrice: 4, description: "Ressource de forêt destinée à la vente ou à la fabrication." },
    { id: "resource_defense_de_sanglier", name: "Défense de sanglier", emoji: "🦷", type: "resource", sellPrice: 6, description: "Ressource de forêt destinée à la vente ou à la fabrication." },
    { id: "resource_morceau_de_ferraille", name: "Morceau de ferraille", emoji: "⚙️", type: "resource", sellPrice: 5, description: "Ressource de forêt destinée à la vente ou à la fabrication." },
    { id: "resource_os_de_monstre", name: "Os de monstre", emoji: "🦴", type: "resource", sellPrice: 3, description: "Ressource de forêt destinée à la vente ou à la fabrication." },
    { id: "resource_soie_araignee", name: "Soie d’araignée", emoji: "🕸️", type: "resource", sellPrice: 5, description: "Ressource de forêt destinée à la vente ou à la fabrication." },
    { id: "resource_venin_araignee", name: "Venin d’araignée", emoji: "🧪", type: "resource", sellPrice: 8, description: "Ressource de forêt destinée à la vente ou à la fabrication." },
    { id: "resource_ecaille_de_serpent", name: "Écaille de serpent", emoji: "🐍", type: "resource", sellPrice: 5, description: "Ressource de forêt destinée à la vente ou à la fabrication." },
    { id: "resource_croc_de_serpent", name: "Croc de serpent", emoji: "🦷", type: "resource", sellPrice: 6, description: "Ressource de forêt destinée à la vente ou à la fabrication." },
    { id: "resource_bois_solide", name: "Bois solide", emoji: "🪵", type: "resource", sellPrice: 4, description: "Ressource de forêt destinée à la vente ou à la fabrication." },
    { id: "resource_ecorce_ancienne", name: "Écorce ancienne", emoji: "🌳", type: "resource", sellPrice: 8, description: "Ressource de forêt destinée à la vente ou à la fabrication." }
  ]
};

function createItemInstance(itemTemplate) {
  return structuredClone({
    ...itemTemplate,
    id: createId(itemTemplate.id)
  });
}

function createDebugInventory() {
  return [
    ...ITEM_DATABASE.consumables,
    ...ITEM_DATABASE.weapons,
    ...ITEM_DATABASE.armors,
    ...ITEM_DATABASE.resources
  ].map(createItemInstance);
}

function loadSaves() {
  try {
    const rawSaves = localStorage.getItem(STORAGE_KEY);
    gameState.saves = rawSaves ? JSON.parse(rawSaves) : [];
  } catch (error) {
    gameState.saves = [];
  }
}

function persistSaves() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState.saves));
}

function createNewSave() {
  const now = new Date();
  const save = {
    id: createId("save"),
    name: `Partie ${gameState.saves.length + 1}`,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    team: structuredClone(gameState.team),
    selectedCharacterId: gameState.selectedCharacterId,
    inventory: structuredClone(gameState.inventory),
    gold: gameState.gold,
    logs: [...gameState.logs]
  };

  gameState.saves.push(save);
  gameState.currentSaveId = save.id;
  gameState.selectedSaveId = save.id;
  persistSaves();
  return save;
}

function saveCurrentGame() {
  if (!gameState.currentSaveId) {
    return createNewSave();
  }

  const save = gameState.saves.find((candidate) => candidate.id === gameState.currentSaveId);
  if (!save) {
    return createNewSave();
  }

  save.updatedAt = new Date().toISOString();
  save.team = structuredClone(gameState.team);
  save.selectedCharacterId = gameState.selectedCharacterId;
  save.inventory = structuredClone(gameState.inventory);
  save.gold = gameState.gold;
  save.logs = [...gameState.logs];
  persistSaves();
  return save;
}

function deleteSave(saveId) {
  gameState.saves = gameState.saves.filter((save) => save.id !== saveId);
  if (gameState.selectedSaveId === saveId) {
    gameState.selectedSaveId = null;
  }
  if (gameState.currentSaveId === saveId) {
    gameState.currentSaveId = null;
  }
  persistSaves();
  render();
}

function selectSave(saveId) {
  gameState.selectedSaveId = saveId;
  render();
}

function loadSave(saveId) {
  const save = gameState.saves.find((candidate) => candidate.id === saveId);
  if (!save) {
    return;
  }

  gameState.currentSaveId = save.id;
  gameState.team = structuredClone(save.team);
  gameState.selectedCharacterId = save.selectedCharacterId || gameState.team[0]?.id || null;
  gameState.inventory = structuredClone(save.inventory);
  gameState.gold = save.gold || 0;
  gameState.logs = [...(save.logs || [])];
  gameState.selectedInventoryItemId = null;
  gameState.selectedEquipmentSlot = null;
  gameState.activePopup = null;
  gameState.merchantMode = "buy";
  gameState.tavernMode = "menu";
  gameState.tavernMessage = null;
  gameState.restRemainingSeconds = 60;
  setScreen("main");
}

function startNewGameCreation() {
  gameState.currentSaveId = null;
  gameState.team = [];
  gameState.selectedCharacterId = null;
  gameState.inventory = [];
  gameState.gold = 0;
  gameState.logs = [
    "Bienvenue dans Valeria Rebuild.",
    "Créez votre équipe et préparez votre aventure."
  ];
  gameState.selectedInventoryItemId = null;
  gameState.selectedEquipmentSlot = null;
  gameState.activePopup = null;
  gameState.merchantMode = "buy";
  gameState.tavernMode = "menu";
  gameState.tavernMessage = null;
  gameState.restRemainingSeconds = 60;
  creationDraft = getInitialCreationDraft();
  setScreen("creation");
}

function setScreen(screen) {
  gameState.screen = screen;
  render();
}

function getSpentCreationPoints() {
  return Object.values(creationDraft.baseStats).reduce((total, value) => total + value - 1, 0);
}

function getRemainingCreationPoints() {
  return BASE_POINTS_TO_PLACE - getSpentCreationPoints();
}

function updateCreationPseudo(value) {
  creationDraft.pseudo = value;
}

function updateCreationClass(classId) {
  creationDraft.classId = classId;
  render();
}

function changeCreationStat(statKey, delta) {
  const currentValue = creationDraft.baseStats[statKey];
  const remainingPoints = getRemainingCreationPoints();

  if (delta > 0 && remainingPoints <= 0) {
    return;
  }

  if (delta < 0 && currentValue <= 1) {
    return;
  }

  creationDraft.baseStats[statKey] = currentValue + delta;
  render();
}

function addCharacterFromDraft() {
  const pseudo = creationDraft.pseudo.trim();
  const remainingPoints = getRemainingCreationPoints();

  if (!pseudo) {
    return;
  }

  if (!creationDraft.classId) {
    return;
  }

  if (remainingPoints !== 0) {
    return;
  }

  if (gameState.team.length >= MAX_TEAM_SIZE) {
    return;
  }

  gameState.team.push(createCharacter(pseudo, creationDraft.classId, creationDraft.baseStats));
  creationDraft = getInitialCreationDraft();
  render();
}

function removeCharacter(characterId) {
  gameState.team = gameState.team.filter((character) => character.id !== characterId);
  if (gameState.selectedCharacterId === characterId) {
    gameState.selectedCharacterId = gameState.team[0]?.id || null;
  }
  render();
}

function launchAdventure() {
  if (gameState.team.length < 1) {
    return;
  }

  gameState.selectedCharacterId = gameState.team[0].id;
  gameState.inventory = [];
  gameState.gold = 0;
  gameState.logs = [
    "Bienvenue dans Valeria Rebuild.",
    "Créez votre équipe et préparez votre aventure."
  ];
  createNewSave();
  setScreen("main");
}

function gainTeamExp(amount) {
  gameState.team.forEach((character) => {
    character.exp += amount;

    while (character.exp >= character.expToNext) {
      character.exp -= character.expToNext;
      character.level += 1;
      character.expToNext = Math.floor(character.expToNext * 1.25);
      character.derivedStats = calculateDerivedStats(character.baseStats, character.level);
      character.maxHp = character.derivedStats.maxHp;
      character.maxEnergy = character.derivedStats.maxEnergy;
      character.hp = character.maxHp;
      character.energy = character.maxEnergy;
    }
  });

  addLog(`[Système] L’équipe gagne ${amount} EXP.`);
  saveCurrentGame();
}

function addLog(message) {
  gameState.logs.push(message);
  if (gameState.logs.length > 100) {
    gameState.logs.shift();
  }
}

function selectCharacter(characterId) {
  gameState.selectedCharacterId = characterId;
  gameState.selectedEquipmentSlot = null;
  render();
}

function selectInventoryItem(itemId) {
  gameState.selectedInventoryItemId = itemId;
  render();
}

function selectEquipmentSlot(slot) {
  gameState.selectedEquipmentSlot = slot;
  render();
}

function useSelectedInventoryItem() {
  const character = getSelectedCharacter();
  const itemIndex = gameState.inventory.findIndex((candidate) => candidate.id === gameState.selectedInventoryItemId);
  const item = gameState.inventory[itemIndex];

  if (!item) {
    addLog("[Système] Aucun objet sélectionné.");
    renderAndSave();
    return;
  }

  if (!character) {
    addLog("[Système] Aucun personnage sélectionné.");
    renderAndSave();
    return;
  }

  if (item.type !== "consumable") {
    addLog("[Système] Cet objet ne peut pas être utilisé.");
    renderAndSave();
    return;
  }

  const finalStats = getFinalCharacterStats(character);

  if (item.effectType === "restoreHpPercent") {
    const healAmount = Math.ceil(finalStats.maxHp * item.effectValue / 100);
    character.hp = Math.min(finalStats.maxHp, character.hp + healAmount);
    gameState.inventory.splice(itemIndex, 1);
    gameState.selectedInventoryItemId = null;
    addLog("[Système] Potion de vie utilisée. PV restaurés.");
    renderAndSave();
    return;
  }

  if (item.effectType === "restoreEnergyPercent") {
    const energyAmount = Math.ceil(finalStats.maxEnergy * item.effectValue / 100);
    character.energy = Math.min(finalStats.maxEnergy, character.energy + energyAmount);
    gameState.inventory.splice(itemIndex, 1);
    gameState.selectedInventoryItemId = null;
    addLog("[Système] Potion d’énergie utilisée. Énergie restaurée.");
    renderAndSave();
    return;
  }

  addLog("[Système] Cet objet ne peut pas être utilisé.");
  renderAndSave();
}

function equipSelectedInventoryItem() {
  const character = getSelectedCharacter();
  const itemIndex = gameState.inventory.findIndex((item) => item.id === gameState.selectedInventoryItemId);
  const item = gameState.inventory[itemIndex];

  if (!character || !item) {
    addLog("[Système] Aucun objet sélectionné.");
    renderAndSave();
    return;
  }

  const slot = item.type === "weapon" ? "arme" : item.type === "armor" ? "armure" : null;
  if (!slot) {
    addLog("[Système] Cet objet ne peut pas être équipé.");
    renderAndSave();
    return;
  }

  const previousItem = character.equipment[slot];
  character.equipment[slot] = item;
  gameState.inventory.splice(itemIndex, 1);

  if (previousItem) {
    gameState.inventory.push(previousItem);
  }

  clampCharacterCurrentVitals(character);
  gameState.selectedInventoryItemId = null;
  addLog(`[Système] ${item.name} équipé sur ${character.pseudo}.`);
  renderAndSave();
}

function dropSelectedInventoryItem() {
  const itemIndex = gameState.inventory.findIndex((item) => item.id === gameState.selectedInventoryItemId);

  if (itemIndex < 0) {
    addLog("[Système] Aucun objet sélectionné.");
    renderAndSave();
    return;
  }

  const [item] = gameState.inventory.splice(itemIndex, 1);
  gameState.selectedInventoryItemId = null;
  addLog(`[Système] ${item.name} jeté.`);
  renderAndSave();
}

function unequipSelectedItem() {
  const character = getSelectedCharacter();
  const slot = gameState.selectedEquipmentSlot;

  if (!character || !slot || !character.equipment[slot]) {
    addLog("[Système] Aucun équipement sélectionné.");
    renderAndSave();
    return;
  }

  const item = character.equipment[slot];
  character.equipment[slot] = null;
  gameState.inventory.push(item);
  clampCharacterCurrentVitals(character);
  gameState.selectedEquipmentSlot = null;
  addLog(`[Système] ${item.name} déséquipé.`);
  renderAndSave();
}

function visitPlace(placeName) {
  if (placeName === "Taverne") {
    openTavernPopup();
    return;
  }

  if (placeName === "Marchand") {
    openMerchantPopup();
    return;
  }

  addLog(`[Système] ${placeName} bientôt disponible.`);
  renderAndSave();
}

function openMerchantPopup() {
  gameState.activePopup = "merchant";
  gameState.merchantMode = "buy";
  gameState.merchantMessage = null;
  render();
}

function closeMerchantPopup() {
  gameState.activePopup = null;
  gameState.merchantMode = "buy";
  gameState.merchantMessage = null;
  render();
}

function setMerchantMode(mode) {
  if (mode !== "buy" && mode !== "sell") {
    return;
  }

  gameState.merchantMode = mode;
  gameState.merchantMessage = null;
  render();
}

function getMerchantBuyItems() {
  return [
    ...ITEM_DATABASE.consumables,
    ...ITEM_DATABASE.weapons,
    ...ITEM_DATABASE.armors
  ];
}

function getMerchantBuyItemById(itemId) {
  return getMerchantBuyItems().find((item) => item.id === itemId) || null;
}

function getInventoryResourceCount(resourceName) {
  return gameState.inventory.filter((item) => item.type === "resource" && item.name === resourceName).length;
}

function hasRequiredMaterials(materials = []) {
  return materials.every((material) => getInventoryResourceCount(material.name) >= material.quantity);
}

function removeRequiredMaterials(materials = []) {
  materials.forEach((material) => {
    let remaining = material.quantity;

    for (let index = gameState.inventory.length - 1; index >= 0 && remaining > 0; index -= 1) {
      const item = gameState.inventory[index];
      if (item.type === "resource" && item.name === material.name) {
        gameState.inventory.splice(index, 1);
        remaining -= 1;
      }
    }
  });
}

function buyAtMerchant(itemId) {
  const itemTemplate = getMerchantBuyItemById(itemId);
  if (!itemTemplate) {
    return;
  }

  const price = getMerchantBuyPrice(itemTemplate);
  const isEquipment = itemTemplate.type === "weapon" || itemTemplate.type === "armor";

  if (isEquipment && !hasRequiredMaterials(itemTemplate.materials)) {
    showMerchantMessage(getMissingMaterialsMessage(itemTemplate));
    return;
  }

  if (gameState.gold < price) {
    showMerchantMessage(
      "Le marchand croise les bras.\n\n“J’aimerais bien vous aider, mais l’or ne pousse pas dans les arbres. Revenez quand votre bourse sera un peu plus lourde.”"
    );
    return;
  }

  gameState.gold -= price;

  if (isEquipment) {
    removeRequiredMaterials(itemTemplate.materials);
    gameState.inventory.push(createItemInstance(itemTemplate));
    addLog(`[Marchand] ${itemTemplate.name} fabriquée.`);
  } else {
    gameState.inventory.push(createItemInstance(itemTemplate));
    addLog(`[Marchand] ${itemTemplate.name} achetée.`);
  }

  renderAndSavePreservingMerchantScroll();
}

function getMissingMaterialsMessage(item) {
  const materialLines = (item.materials || [])
    .map((material) => `- ${material.name} x${material.quantity}`)
    .join("\n");

  return `Le marchand se gratte la barbe.\n“Je n’ai plus cet article en stock. Mais rapportez-moi les matériaux nécessaires, et je vous le fabriquerai à prix réduit.”\n\nMatériaux nécessaires :\n${materialLines}`;
}

function showMerchantMessage(message) {
  gameState.merchantMessage = message;
  renderPreservingMerchantScroll();
}

function closeMerchantMessage() {
  gameState.merchantMessage = null;
  renderPreservingMerchantScroll();
}

function sellAtMerchant(itemId) {
  const itemIndex = gameState.inventory.findIndex((item) => item.id === itemId);
  const item = gameState.inventory[itemIndex];

  if (!item) {
    return;
  }

  const sellPrice = item.sellPrice || 0;
  if (sellPrice <= 0) {
    addLog("[Marchand] Cet objet ne peut pas être vendu.");
    renderAndSavePreservingMerchantScroll();
    return;
  }

  gameState.gold += sellPrice;
  gameState.inventory.splice(itemIndex, 1);

  if (gameState.selectedInventoryItemId === item.id) {
    gameState.selectedInventoryItemId = null;
  }

  addLog(`[Marchand] ${item.name} vendu pour ${sellPrice} Or.`);
  renderAndSavePreservingMerchantScroll();
}

function renderAndSavePreservingMerchantScroll() {
  preserveMerchantScroll(renderAndSave);
}

function renderPreservingMerchantScroll() {
  preserveMerchantScroll(render);
}

function preserveMerchantScroll(renderCallback) {
  const list = getGameContent().querySelector(".merchant-list");
  const previousScrollTop = list ? list.scrollTop : 0;

  renderCallback();

  const restoreScroll = () => {
    const newList = getGameContent().querySelector(".merchant-list");
    if (newList) {
      newList.scrollTop = previousScrollTop;
    }
  };

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(restoreScroll);
    return;
  }

  restoreScroll();
}

function openTavernPopup() {
  gameState.activePopup = "tavern";
  if (gameState.tavernMode !== "resting") {
    gameState.tavernMode = "menu";
    gameState.tavernMessage = null;
  }
  render();
}

function closeTavernPopup() {
  if (gameState.tavernMode === "resting") {
    return;
  }

  gameState.activePopup = null;
  gameState.tavernMode = "menu";
  gameState.tavernMessage = null;
  render();
}

function closePopup() {
  if (gameState.activePopup === "tavern") {
    closeTavernPopup();
    return;
  }

  if (gameState.activePopup === "merchant") {
    closeMerchantPopup();
    return;
  }

  gameState.activePopup = null;
  render();
}

function restoreTeamHp() {
  gameState.team.forEach((character) => {
    character.hp = getFinalCharacterStats(character).maxHp;
  });
}

function restoreTeamEnergy() {
  gameState.team.forEach((character) => {
    character.energy = getFinalCharacterStats(character).maxEnergy;
  });
}

function restoreTeamFull() {
  restoreTeamHp();
  restoreTeamEnergy();
}

function saveExistingGame() {
  if (gameState.currentSaveId) {
    saveCurrentGame();
  }
}

function clearTavernRestTimer() {
  if (tavernRestTimerId) {
    clearInterval(tavernRestTimerId);
    tavernRestTimerId = null;
  }
}

function formatRestTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function startTavernRest() {
  if (gameState.tavernMode === "resting") {
    return;
  }

  const restEndTime = Date.now() + 60000;
  gameState.tavernMode = "resting";
  gameState.tavernMessage = null;
  gameState.restRemainingSeconds = 60;
  render();

  clearTavernRestTimer();

  tavernRestTimerId = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((restEndTime - Date.now()) / 1000));
    gameState.restRemainingSeconds = remaining;

    if (remaining > 0) {
      render();
      return;
    }

    completeTavernRest();
  }, 1000);
}

function restAtTavern() {
  startTavernRest();
}

function cancelTavernRest() {
  if (gameState.tavernMode !== "resting") {
    return;
  }

  clearTavernRestTimer();
  gameState.tavernMode = "menu";
  gameState.restRemainingSeconds = 60;
  render();
}

function completeTavernRest() {
  clearTavernRestTimer();
  gameState.restRemainingSeconds = 0;
  restoreTeamFull();
  addLog("[Taverne] Toute l’équipe s’est reposée. PV et énergie restaurés.");
  showTavernMessage("La nuit fut courte, mais réparatrice. Vous vous sentez prêt à reprendre la route.");
  saveExistingGame();
  gameState.restRemainingSeconds = 60;
}

function showTavernMessage(text) {
  gameState.tavernMode = "message";
  gameState.tavernMessage = text;
  render();
}

function closeTavernMessage() {
  gameState.tavernMode = "menu";
  gameState.tavernMessage = null;
  render();
}

function drinkAtTavern() {
  if (gameState.gold < 20) {
    addLog("[Taverne] Pas assez d’or pour boire un verre.");
    showTavernMessage("Pas d’or, pas de chope. Même les héros payent leur tournée.");
    saveExistingGame();
    return;
  }

  gameState.gold -= 20;
  restoreTeamEnergy();
  addLog("[Taverne] L’équipe boit un verre. Énergie restaurée.");
  showTavernMessage("Moe vous sert une chope bien fraîche.\nVotre énergie est restaurée.");
  saveExistingGame();
}

function eatAtTavern() {
  if (gameState.gold < 30) {
    addLog("[Taverne] Pas assez d’or pour manger un repas.");
    showTavernMessage("Hé l’ami, ici on ne mange pas à l’œil. Reviens quand tu pourras me payer.");
    saveExistingGame();
    return;
  }

  gameState.gold -= 30;
  restoreTeamHp();
  addLog("[Taverne] L’équipe mange un repas. PV restaurés.");
  showTavernMessage("Moe vous sert un repas chaud et réconfortant.\nVos PV sont restaurés.");
  saveExistingGame();
}

function renderAndSave() {
  render();
  saveCurrentGame();
}

function render() {
  if (gameState.screen === "saves") {
    renderSavesScreen();
    return;
  }

  if (gameState.screen === "creation") {
    renderCreationScreen();
    return;
  }

  renderMainMenu();
}

function renderSavesScreen() {
  const screen = getGameContent();
  const saveItems = gameState.saves.length
    ? gameState.saves.map((save) => {
        const isSelected = save.id === gameState.selectedSaveId;
        const date = new Date(save.updatedAt || save.createdAt).toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });

        return `
          <button class="save-item ${isSelected ? "is-selected" : ""}" data-action="select-save" data-save-id="${save.id}">
            <span>
              <strong>${escapeHtml(save.name)}</strong><br>
              <span class="small muted">${save.team.length} membre(s) - ${date}</span>
            </span>
            <span>${isSelected ? "Sélectionnée" : "Choisir"}</span>
          </button>
        `;
      }).join("")
    : `<div class="empty-message">Aucune sauvegarde</div>`;

  screen.innerHTML = `
    <section class="game-ui save-screen">
      <h1 class="game-title">VALERIA REBUILD</h1>
      <div class="panel save-panel">
        <h2 class="panel-title">Liste des sauvegardes</h2>
        <div class="save-list">${saveItems}</div>
        <div class="button-row">
          <button type="button" data-action="new-game">Créer partie</button>
          <button type="button" data-action="play-save" ${gameState.selectedSaveId ? "" : "disabled"}>Jouer</button>
          <button type="button" data-action="delete-save" ${gameState.selectedSaveId ? "" : "disabled"}>Supprimer</button>
        </div>
      </div>
    </section>
  `;
}

function renderCreationScreen() {
  const screen = getGameContent();
  const selectedClass = getClassById(creationDraft.classId);
  const remainingPoints = getRemainingCreationPoints();
  const classOptions = CLASSES.map((characterClass) => `
    <option value="${characterClass.id}" ${characterClass.id === creationDraft.classId ? "selected" : ""}>
      ${characterClass.emoji} ${characterClass.name}
    </option>
  `).join("");

  const statRows = Object.entries(BASE_STATS).map(([statKey, label]) => `
    <div class="stat-row">
      <span class="stat-name">${label}</span>
      <button type="button" data-action="stat-minus" data-stat="${statKey}" ${creationDraft.baseStats[statKey] <= 1 ? "disabled" : ""}>-</button>
      <span class="stat-value">${creationDraft.baseStats[statKey]}</span>
      <button type="button" data-action="stat-plus" data-stat="${statKey}" ${remainingPoints <= 0 ? "disabled" : ""}>+</button>
    </div>
  `).join("");

  const teamItems = gameState.team.length
    ? gameState.team.map((character) => {
        const characterClass = getClassById(character.classId);
        return `
          <div class="team-create-item">
            <span>${character.emoji}</span>
            <span>
              <span class="team-create-name">${escapeHtml(character.pseudo)}</span><br>
              <span class="small muted">${characterClass.name}</span>
            </span>
            <button type="button" data-action="remove-character" data-character-id="${character.id}">Retirer</button>
          </div>
        `;
      }).join("")
    : `<div class="empty-message">Aucun membre</div>`;

  const canAdd = creationDraft.pseudo.trim() && creationDraft.classId && remainingPoints === 0 && gameState.team.length < MAX_TEAM_SIZE;

  screen.innerHTML = `
    <section class="game-ui">
      <h1 class="game-title">VALERIA REBUILD / Création d’équipe</h1>
      <div class="screen-body creation-grid">
        <section class="panel">
          <h2 class="panel-title">Créer un personnage</h2>
          <div class="field">
            <label for="pseudoInput">Pseudo</label>
            <input id="pseudoInput" type="text" maxlength="18" value="${escapeHtml(creationDraft.pseudo)}" data-action="pseudo-input">
          </div>
          <div class="field">
            <label for="classSelect">Classe</label>
            <select id="classSelect" data-action="class-select">${classOptions}</select>
          </div>
          <div class="class-description">
            <strong>Description de la classe</strong><br>
            <span>${selectedClass.description}</span>
          </div>
          <div class="stats-box">
            <div class="row">
              <strong>Attributs</strong>
              <span class="muted small">(${remainingPoints} point(s) à placer)</span>
            </div>
            ${statRows}
          </div>
          <button type="button" data-action="add-character" ${canAdd ? "" : "disabled"}>Ajouter</button>
        </section>
        <section class="panel">
          <h2 class="panel-title">Équipe (${gameState.team.length}/${MAX_TEAM_SIZE})</h2>
          <div class="team-create-list">${teamItems}</div>
          <button type="button" data-action="launch-adventure" ${gameState.team.length ? "" : "disabled"}>Lancer l’aventure</button>
        </section>
      </div>
    </section>
  `;

  const blurActiveElement = () => {
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
  };

  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(blurActiveElement);
  } else {
    blurActiveElement();
  }
}

function renderMainMenu() {
  const screen = getGameContent();
  const character = getSelectedCharacter();

  screen.innerHTML = `
    <section class="game-ui">
      <h1 class="game-title">VALERIA REBUILD</h1>
      <div class="screen-body main-grid">
        ${renderTeamPanel()}
        ${renderCharacterPanel(character)}
        ${renderMapPanel()}
        ${renderLogsPanel()}
        ${renderEquipmentPanel(character)}
        ${renderInventoryPanel()}
      </div>
      ${renderActivePopup()}
    </section>
  `;

  const logList = screen.querySelector(".log-list");
  if (logList) {
    logList.scrollTop = logList.scrollHeight;
  }
}

function renderActivePopup() {
  if (gameState.activePopup === "tavern") {
    return renderTavernPopup();
  }

  if (gameState.activePopup === "merchant") {
    return renderMerchantPopup();
  }

  return "";
}

function renderMerchantPopup() {
  return `
    <div class="popup-overlay" role="dialog" aria-modal="true" aria-labelledby="merchantTitle">
      <div class="merchant-popup">
        <div class="merchant-header">
          <h2 class="popup-title" id="merchantTitle">Marchand 💰</h2>
          <button type="button" class="merchant-close-button" data-action="close-popup">Quitter</button>
        </div>
        <div class="popup-separator"></div>
        <div class="merchant-toolbar">
          <div class="merchant-tabs">
            <button type="button" class="merchant-tab ${gameState.merchantMode === "buy" ? "is-active" : ""}" data-action="merchant-mode" data-mode="buy">Acheter</button>
            <button type="button" class="merchant-tab ${gameState.merchantMode === "sell" ? "is-active" : ""}" data-action="merchant-mode" data-mode="sell">Vendre</button>
          </div>
          <div class="merchant-gold">${gameState.gold} Or</div>
        </div>
        ${gameState.merchantMode === "buy" ? renderMerchantBuyList() : renderMerchantSellList()}
        ${gameState.merchantMessage ? renderMerchantMessage() : ""}
      </div>
    </div>
  `;
}

function renderMerchantMessage() {
  return `
    <div class="merchant-message-overlay">
      <div class="merchant-message">
        <h3 class="popup-title">Marchand 💰</h3>
        <div class="popup-separator"></div>
        <p class="popup-intro">${formatTavernMessage(gameState.merchantMessage)}</p>
        <button type="button" class="tavern-close-button" data-action="merchant-close-message">
          <strong>OK</strong>
        </button>
      </div>
    </div>
  `;
}

function renderMerchantBuyList() {
  return `
    <div class="merchant-list">
      ${renderMerchantCategory("Consommables", ITEM_DATABASE.consumables, "buy")}
      ${renderMerchantCategory("Armes", ITEM_DATABASE.weapons, "buy")}
      ${renderMerchantCategory("Armures", ITEM_DATABASE.armors, "buy")}
    </div>
  `;
}

function renderMerchantSellList() {
  if (!gameState.inventory.length) {
    return `
      <div class="merchant-list">
        <div class="empty-message">Inventaire vide.</div>
      </div>
    `;
  }

  return `
    <div class="merchant-list">
      ${gameState.inventory.map((item) => renderMerchantItemRow(item, "sell")).join("")}
    </div>
  `;
}

function renderMerchantCategory(title, items, mode) {
  return `
    <div class="merchant-category-title">${title}</div>
    ${items.map((item) => renderMerchantItemRow(item, mode)).join("")}
  `;
}

function renderMerchantItemRow(item, mode) {
  const priceLabel = mode === "buy" ? "Prix" : "Prix de vente";
  const price = mode === "buy" ? getMerchantBuyPrice(item) : getMerchantSellPrice(item);
  const actionLabel = mode === "buy" ? "Acheter" : "Vendre";
  const action = mode === "buy" ? "merchant-buy" : "merchant-sell";
  const detail = getMerchantItemDetail(item, mode);
  const materials = mode === "buy" ? formatMaterials(item) : "";
  const unavailableClass = mode === "buy" && !canBuyMerchantItem(item) ? " is-unavailable" : "";

  return `
    <div class="merchant-item">
      <div class="merchant-item-emoji">${item.emoji}</div>
      <div class="merchant-item-main">
        <div class="merchant-item-name">${formatItemTitle(item)}</div>
        ${detail ? `<div class="merchant-item-detail">${detail}</div>` : ""}
        ${materials ? `<div class="merchant-item-materials">${materials}</div>` : ""}
        <div class="merchant-item-price">${priceLabel} : ${price} Or</div>
      </div>
      <button type="button" class="merchant-item-action${unavailableClass}" data-action="${action}" data-item-id="${item.id}">${actionLabel}</button>
    </div>
  `;
}

function getMerchantItemDetail(item, mode) {
  if (mode === "sell" && item.type === "resource") {
    return "";
  }

  return formatItemDetail(item);
}

function getMerchantBuyPrice(item) {
  if (item.type === "weapon" || item.type === "armor") {
    return item.reducedPrice || 0;
  }

  return item.buyPrice || 30;
}

function getMerchantSellPrice(item) {
  return item.sellPrice || 0;
}

function canBuyMerchantItem(item) {
  const price = getMerchantBuyPrice(item);
  if (gameState.gold < price) {
    return false;
  }

  if (item.type === "weapon" || item.type === "armor") {
    return hasRequiredMaterials(item.materials);
  }

  return true;
}

function formatMaterials(item) {
  if (!item.materials?.length) {
    return "";
  }

  const materials = item.materials.map((material) => `${material.name} x${material.quantity}`).join(", ");
  return `Matériaux : ${materials}`;
}

function renderTavernPopup() {
  if (gameState.tavernMode === "resting") {
    return renderTavernRestPopup();
  }

  if (gameState.tavernMode === "message") {
    return renderTavernMessagePopup();
  }

  return `
    <div class="popup-overlay" role="dialog" aria-modal="true" aria-labelledby="tavernTitle">
      <div class="tavern-popup">
        <h2 class="popup-title" id="tavernTitle">Taverne 🍻</h2>
        <div class="popup-separator"></div>
        <p class="popup-intro">
          Bienvenue à la taverne de Moe.<br>
          Qu’est-ce qui vous ferait plaisir ?
        </p>
        <div class="tavern-actions">
          <button type="button" class="tavern-action-card" data-action="tavern-rest">
            <span class="tavern-action-icon">🛏️</span>
            <span class="tavern-action-copy">
              <strong>Se reposer</strong>
              <span><b>Durée :</b> 1 min</span>
              <span>Régénère tous les PV et toute l’énergie</span>
            </span>
          </button>
          <button type="button" class="tavern-action-card" data-action="tavern-drink">
            <span class="tavern-action-icon">🍺</span>
            <span class="tavern-action-copy">
              <strong>Boire un verre</strong>
              <span><b>Coût :</b> 20 pièces</span>
              <span>Régénère toute l’énergie</span>
            </span>
          </button>
          <button type="button" class="tavern-action-card" data-action="tavern-eat">
            <span class="tavern-action-icon">🍲</span>
            <span class="tavern-action-copy">
              <strong>Manger un repas</strong>
              <span><b>Coût :</b> 30 pièces</span>
              <span>Régénère tous les PV</span>
            </span>
          </button>
        </div>
        <button type="button" class="tavern-close-button" data-action="close-popup">
          <span>🚪</span>
          <strong>Quitter</strong>
        </button>
      </div>
    </div>
  `;
}

function renderTavernRestPopup() {
  return `
    <div class="popup-overlay" role="dialog" aria-modal="true" aria-labelledby="tavernRestTitle">
      <div class="tavern-popup tavern-state-popup">
        <h2 class="popup-title" id="tavernRestTitle">Taverne 🍻</h2>
        <div class="popup-separator"></div>
        <p class="popup-intro">
          Vous vous reposez.<br>
          Temps d’attente : <strong>${formatRestTime(gameState.restRemainingSeconds)}</strong>
        </p>
        <button type="button" class="tavern-close-button" data-action="tavern-cancel-rest">
          <span>🚪</span>
          <strong>Quitter</strong>
        </button>
      </div>
    </div>
  `;
}

function renderTavernMessagePopup() {
  return `
    <div class="popup-overlay" role="dialog" aria-modal="true" aria-labelledby="tavernMessageTitle">
      <div class="tavern-popup tavern-message-popup">
        <h2 class="popup-title" id="tavernMessageTitle">Taverne 🍻</h2>
        <div class="popup-separator"></div>
        <p class="popup-intro">${formatTavernMessage(gameState.tavernMessage || "")}</p>
        <button type="button" class="tavern-close-button" data-action="tavern-close-message">
          <strong>OK</strong>
        </button>
      </div>
    </div>
  `;
}

function formatTavernMessage(message) {
  return escapeHtml(message).replaceAll("\n", "<br>");
}

function renderTeamPanel() {
  const slots = gameState.team.map((character) => `
    <button
      type="button"
      class="team-slot ${character.id === gameState.selectedCharacterId ? "is-selected" : ""}"
      data-action="select-character"
      data-character-id="${character.id}"
      title="${escapeHtml(character.pseudo)}"
    >${character.emoji}</button>
  `).join("");

  return `
    <section class="panel team-panel">
      <h2 class="panel-title">Équipe</h2>
      <div class="team-list">${slots}</div>
    </section>
  `;
}

function renderCharacterPanel(character) {
  if (!character) {
    return `
      <section class="panel character-panel">
        <h2 class="panel-title">Personnage</h2>
        <div class="empty-message">Aucun personnage</div>
      </section>
    `;
  }

  const finalStats = getFinalCharacterStats(character);

  return `
    <section class="panel character-panel">
      <h2 class="panel-title">Personnage</h2>
      <div class="character-top">
        <div class="character-name">${escapeHtml(character.pseudo)} (Niv.${character.level})</div>
        <div class="separator"></div>
        ${renderBar("PV", character.hp, finalStats.maxHp)}
        <div class="separator"></div>
        ${renderBar("Énergie", character.energy, finalStats.maxEnergy)}
        <div class="separator"></div>
        <div class="character-emoji">${character.emoji}</div>
      </div>
      <div class="character-bottom">
        ${renderCharacterStats(character)}
        <div class="separator"></div>
        ${renderBar("EXP", character.exp, character.expToNext)}
        <div class="separator"></div>
        <div class="gold-line">Or : ${gameState.gold}</div>
      </div>
    </section>
  `;
}

function renderCharacterStats(character) {
  const baseStats = character.baseStats;
  const finalStats = getFinalCharacterStats(character);

  return `
    <div class="character-stats">
      <div class="stats-group">
        <div class="stat-line stat-for"><span>FOR</span><strong>${baseStats.force}</strong></div>
        <div class="stat-line stat-rap"><span>RAP</span><strong>${baseStats.speed}</strong></div>
        <div class="stat-line stat-con"><span>CON</span><strong>${baseStats.constitution}</strong></div>
        <div class="stat-line stat-mana"><span>MANA</span><strong>${baseStats.mana}</strong></div>
      </div>
      <div class="stats-group">
        <div class="stat-line stat-pp"><span>PP</span><strong>${finalStats.physicalPower}</strong></div>
        <div class="stat-line stat-crit"><span>CRIT</span><strong>${finalStats.crit}%</strong></div>
        <div class="stat-line stat-esq"><span>ESQ</span><strong>${finalStats.dodge}%</strong></div>
        <div class="stat-line stat-def"><span>DEF</span><strong>${finalStats.defense}</strong></div>
        <div class="stat-line stat-pm"><span>PM</span><strong>${finalStats.magicPower}</strong></div>
      </div>
    </div>
  `;
}

function renderBar(label, currentValue, maxValue) {
  const percent = maxValue > 0 ? Math.max(0, Math.min(100, (currentValue / maxValue) * 100)) : 0;

  return `
    <div class="bar-block">
      <div class="bar-label">
        <span>${label}</span>
        <span>${currentValue} / ${maxValue}</span>
      </div>
      <div class="bar">
        <div class="bar-fill" style="width: ${percent}%"></div>
      </div>
    </div>
  `;
}

function renderMapPanel() {
  const places = ["Donjon", "Taverne", "Marchand", "Forêt"];
  const buttons = places.map((place) => `
    <button type="button" class="place-button" data-action="visit-place" data-place="${place}">${place}</button>
  `).join("");

  return `
    <section class="panel map-panel">
      <h2 class="panel-title">Carte du monde</h2>
      <div class="map-grid">${buttons}</div>
    </section>
  `;
}

function renderLogsPanel() {
  const logLines = gameState.logs.map((line) => `
    <div class="log-line">${escapeHtml(line)}</div>
  `).join("");

  return `
    <section class="panel logs-panel">
      <h2 class="panel-title">Journal de logs</h2>
      <div class="log-list">${logLines}</div>
    </section>
  `;
}

function renderEquipmentPanel(character) {
  let content = `<div class="empty-message">Aucun équipement</div>`;

  if (character) {
    const equippedItems = [
      { slot: "arme", item: character.equipment.arme },
      { slot: "armure", item: character.equipment.armure }
    ].filter((entry) => entry.item);

    if (equippedItems.length) {
      content = equippedItems.map(({ slot, item }) => `
        <button
          type="button"
          class="equipment-item ${gameState.selectedEquipmentSlot === slot ? "is-selected" : ""}"
          data-action="select-equipment"
          data-slot="${slot}"
        >
          <div class="item-line-main">${formatItemTitle(item)}</div>
          <div class="item-line-detail">${formatItemDetail(item)}</div>
        </button>
      `).join("");
    }
  }

  return `
    <section class="panel equipment-panel">
      <h2 class="panel-title">Équipement</h2>
      <div class="equipment-list">${content}</div>
      <button type="button" data-action="unequip">Déséquiper</button>
    </section>
  `;
}

function renderInventoryPanel() {
  const content = gameState.inventory.length
    ? gameState.inventory.map((item) => `
        <button
          type="button"
          class="inventory-item ${item.id === gameState.selectedInventoryItemId ? "is-selected" : ""}"
          data-action="select-inventory"
          data-item-id="${item.id}"
        >
          <div class="item-line-main">${formatItemTitle(item)}</div>
          <div class="item-line-detail">${formatItemDetail(item)}</div>
        </button>
      `).join("")
    : `<div class="empty-message">Inventaire vide</div>`;

  return `
    <section class="panel inventory-panel">
      <h2 class="panel-title">Inventaire</h2>
      <div class="inventory-list">${content}</div>
      <div class="inventory-actions">
        <button type="button" data-action="use-item">Utiliser</button>
        <button type="button" data-action="equip-item">Équiper</button>
        <button type="button" data-action="drop-item">Jeter</button>
      </div>
    </section>
  `;
}

function formatItemTitle(item) {
  const rawName = String(item.name || "").replace(/\s+niv\.\d+$/i, "");
  const safeName = escapeHtml(rawName);

  if (item.type === "resource" || item.type === "consumable") {
    return `${item.emoji} ${safeName}`;
  }

  return `${item.emoji} ${safeName} niv.${item.level || 1}`;
}

function formatItemDetail(item) {
  if (item.type === "weapon" || item.type === "armor") {
    return escapeHtml(item.statsText || formatStats(item.stats));
  }

  if (item.type === "consumable") {
    return escapeHtml(item.effectText || "Effet non défini");
  }

  if (item.type === "resource") {
    return `Prix de vente : ${item.sellPrice || 0} or`;
  }

  return escapeHtml(item.description || "Aucun détail");
}

function formatStats(stats) {
  const labels = {
    physicalPower: "PP",
    defense: "DEF",
    magicPower: "PM",
    crit: "CRIT",
    dodge: "ESQ",
    maxHp: "PV",
    maxEnergy: "PE"
  };

  const parts = Object.entries(stats || {}).map(([key, value]) => `+${value} ${labels[key] || key}`);
  return parts.length ? parts.join(", ") : "Aucune stat";
}

function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) {
    return;
  }

  const action = target.dataset.action;

  if (action === "select-save") {
    selectSave(target.dataset.saveId);
  }

  if (action === "new-game") {
    startNewGameCreation();
  }

  if (action === "play-save") {
    loadSave(gameState.selectedSaveId);
  }

  if (action === "delete-save") {
    deleteSave(gameState.selectedSaveId);
  }

  if (action === "stat-minus") {
    changeCreationStat(target.dataset.stat, -1);
  }

  if (action === "stat-plus") {
    changeCreationStat(target.dataset.stat, 1);
  }

  if (action === "add-character") {
    addCharacterFromDraft();
  }

  if (action === "remove-character") {
    removeCharacter(target.dataset.characterId);
  }

  if (action === "launch-adventure") {
    launchAdventure();
  }

  if (action === "select-character") {
    selectCharacter(target.dataset.characterId);
  }

  if (action === "visit-place") {
    visitPlace(target.dataset.place);
  }

  if (action === "close-popup") {
    closePopup();
  }

  if (action === "merchant-mode") {
    setMerchantMode(target.dataset.mode);
  }

  if (action === "merchant-buy") {
    buyAtMerchant(target.dataset.itemId);
  }

  if (action === "merchant-sell") {
    sellAtMerchant(target.dataset.itemId);
  }

  if (action === "merchant-close-message") {
    closeMerchantMessage();
  }

  if (action === "tavern-rest") {
    restAtTavern();
  }

  if (action === "tavern-cancel-rest") {
    cancelTavernRest();
  }

  if (action === "tavern-close-message") {
    closeTavernMessage();
  }

  if (action === "tavern-drink") {
    drinkAtTavern();
  }

  if (action === "tavern-eat") {
    eatAtTavern();
  }

  if (action === "select-equipment") {
    selectEquipmentSlot(target.dataset.slot);
  }

  if (action === "unequip") {
    unequipSelectedItem();
  }

  if (action === "select-inventory") {
    selectInventoryItem(target.dataset.itemId);
  }

  if (action === "use-item") {
    useSelectedInventoryItem();
  }

  if (action === "equip-item") {
    equipSelectedInventoryItem();
  }

  if (action === "drop-item") {
    dropSelectedInventoryItem();
  }
}

function handleInput(event) {
  const target = event.target;

  if (target.dataset.action === "pseudo-input") {
    updateCreationPseudo(target.value);
  }
}

function handleChange(event) {
  const target = event.target;

  if (target.dataset.action === "class-select") {
    updateCreationClass(target.value);
  }
}

function init() {
  resizeGameScreen();
  loadSaves();
  getGameContent().addEventListener("click", handleClick);
  getGameContent().addEventListener("input", handleInput);
  getGameContent().addEventListener("change", handleChange);
  render();
  resizeGameScreen();
}

init();
