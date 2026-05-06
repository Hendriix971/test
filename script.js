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
  selectedEquipmentSlot: null
};

let creationDraft = getInitialCreationDraft();

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

function createPrototypeInventory() {
  return [
    {
      id: createId("item"),
      name: "Potion",
      emoji: "🧪",
      type: "consumable",
      level: 1,
      effectText: "Restaure 20 PV",
      description: "Objet de soin prototype."
    },
    {
      id: createId("item"),
      name: "Épée",
      emoji: "⚔️",
      type: "weapon",
      level: 1,
      statsText: "+5 PP, +2 DEF",
      description: "Arme simple pour le prototype."
    },
    {
      id: createId("item"),
      name: "Armure légère",
      emoji: "🛡️",
      type: "armor",
      level: 1,
      statsText: "+6 DEF, +2 PV",
      description: "Armure simple pour le prototype."
    },
    {
      id: createId("item"),
      name: "Herbe médicinale",
      emoji: "🌿",
      type: "consumable",
      level: 1,
      effectText: "Restaure 10 PV",
      description: "Consommable prototype."
    },
    {
      id: createId("item"),
      name: "Griffe de loup",
      emoji: "🐺",
      type: "resource",
      sellPrice: 5,
      description: "Ressource destinée à la vente."
    },
    {
      id: createId("item"),
      name: "Os ancien",
      emoji: "🦴",
      type: "resource",
      sellPrice: 12,
      description: "Ressource destinée à la vente."
    }
  ];
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
  gameState.inventory = createPrototypeInventory();
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
  const item = gameState.inventory.find((candidate) => candidate.id === gameState.selectedInventoryItemId);

  if (!item) {
    addLog("[Système] Aucun objet sélectionné.");
    renderAndSave();
    return;
  }

  if (item.type !== "consumable") {
    addLog("[Système] Cet objet ne peut pas être utilisé.");
    renderAndSave();
    return;
  }

  addLog("[Système] Objet utilisé.");
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
  gameState.selectedEquipmentSlot = null;
  addLog(`[Système] ${item.name} déséquipé.`);
  renderAndSave();
}

function visitPlace(placeName) {
  addLog(`[Système] ${placeName} bientôt disponible.`);
  renderAndSave();
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
    </section>
  `;

  const logList = screen.querySelector(".log-list");
  if (logList) {
    logList.scrollTop = logList.scrollHeight;
  }
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

  return `
    <section class="panel character-panel">
      <h2 class="panel-title">Personnage</h2>
      <div class="character-name">${escapeHtml(character.pseudo)} (Niv.${character.level})</div>
      <div class="separator"></div>
      ${renderBar("PV", character.hp, character.maxHp)}
      <div class="separator"></div>
      ${renderBar("Énergie", character.energy, character.maxEnergy)}
      <div class="separator"></div>
      <div class="character-emoji">${character.emoji}</div>
      <div class="separator"></div>
      ${renderCharacterStats(character)}
      <div class="separator"></div>
      ${renderBar("EXP", character.exp, character.expToNext)}
      <div class="separator"></div>
      <div class="gold-line">Or : ${gameState.gold}</div>
    </section>
  `;
}

function renderCharacterStats(character) {
  const baseStats = character.baseStats;
  const derivedStats = character.derivedStats;

  return `
    <div class="character-stats">
      <div class="stats-group">
        <div class="stat-line stat-for"><span>FOR</span><strong>${baseStats.force}</strong></div>
        <div class="stat-line stat-rap"><span>RAP</span><strong>${baseStats.speed}</strong></div>
        <div class="stat-line stat-con"><span>CON</span><strong>${baseStats.constitution}</strong></div>
        <div class="stat-line stat-mana"><span>MANA</span><strong>${baseStats.mana}</strong></div>
      </div>
      <div class="stats-group">
        <div class="stat-line stat-pp"><span>PP</span><strong>${derivedStats.physicalPower}</strong></div>
        <div class="stat-line stat-crit"><span>CRIT</span><strong>${derivedStats.crit}%</strong></div>
        <div class="stat-line stat-esq"><span>ESQ</span><strong>${derivedStats.dodge}%</strong></div>
        <div class="stat-line stat-def"><span>DEF</span><strong>${derivedStats.defense}</strong></div>
        <div class="stat-line stat-pm"><span>PM</span><strong>${derivedStats.magicPower}</strong></div>
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

  if (item.type === "resource") {
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
