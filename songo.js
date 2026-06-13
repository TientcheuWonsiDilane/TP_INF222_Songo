let tableau = Array(18).fill(0);
let scores = { 1: 0, 2: 0 };
let currentPlayer = 1;
let isAnimating = false;

let role = null;
let pret = false;


const pits = document.querySelectorAll(".casse");
const path = [10, 11, 12, 13, 14, 15, 16, 7, 6, 5, 4, 3, 2, 1];
const playablePits = new Set(path);        
const scorePits = new Set([0, 17]);         
const deadPits = new Set([8, 9]);            
document.querySelector(".tour").style.display = "none";

//Ajouter du song
const audioBtn = document.getElementById("btn3");
const audio = document.getElementById("audio");
audioBtn.addEventListener('click', () =>{
    audio.play().then( () =>{
        audioBtn.innerHTML = "Retirer le song";
    }).catch((error) =>{
        console.log(error);
    })
});



//Button de creation de prtie
document.getElementById("btn1").addEventListener("click", async () => {
  const res = await fetch("songo.php?action=creer").then(r => r.json());
  if (res.success) {
    role = res.role;
    document.getElementById("status").innerText = `Code : ${res.code}. En attente du Joueur 2...`;
    initGameListeners();
    startSyncLoop();
  }
});

//Button pour rejoindre une partie
document.getElementById("btn2").addEventListener("click", async () => {
  const code = document.getElementById("code").value;
  const res = await fetch(`songo.php?action=rejoindre&code=${code}`).then(r => r.json());
  if (res.success) {
    role = res.role;
    document.getElementById("status").innerText = `Partie rejointe ! Synchronisation...`;
    initGameListeners();
    startSyncLoop();
  } else {
    alert(res.message);
  }
});

//Initialisation du jeux
function initGameListeners() {
  path.forEach(index => {
    pits[index].addEventListener("click", () => {
      if (!pret || currentPlayer !== role) return;
      playTurn(index);
    });
    pits[index].style.cursor = "pointer";
  });

  updateScoresUI();
  updateTurnUI();
}

//Syncronisation des tableaux
function startSyncLoop() {
  setInterval(async () => {
    if (isAnimating) return;

    const data = await fetch("songo.php?action=sync").then(r => r.json());
    pret = data.ready;

    if (pret) {
      document.getElementById("modal").style.display = "none";
      document.querySelector(".grid").style.pointerEvents = "auto";
      document.querySelector(".grid").style.opacity = "1";
      document.querySelector(".tour").style.display = "block";
      document.getElementById("status").innerText = `Vous êtes le Joueur ${role}`;

      const boardChanged = data.tableau.some((val, idx) => val !== tableau[idx]);

      if (boardChanged) {
        await updateLocalTableauWithAnimation(data.tableau);
        scores = data.scores;
        currentPlayer = data.current_player;
        updateScoresUI();
        updateTurnUI();
      }
    }
  }, 2000);
}

//Animation du tableau locale
async function updateLocalTableauWithAnimation(tableauServeur) {
  for (let i = 0; i < tableau.length; i++) {
    if (deadPits.has(i)) continue;
    if (tableau[i] !== tableauServeur[i]) {
      tableau[i] = tableauServeur[i];
      await animatePit(i, tableau[i]);
    }
  }
}

//Logique generale du jeux
async function playTurn(startIndex) {
  if (isAnimating) return;
  if (currentPlayer === 1 && (startIndex < 10 || startIndex > 16)) return;
  if (currentPlayer === 2 && (startIndex < 1 || startIndex > 7)) return;
  if (tableau[startIndex] === 0) return;

  isAnimating = true;
  let seeds = tableau[startIndex];
  tableau[startIndex] = 0;

  await animatePit(startIndex, 0);

  let pathIdx = path.indexOf(startIndex);
  let currentPit;

  while (seeds > 0) {
    pathIdx = (pathIdx + 1) % path.length;
    currentPit = path[pathIdx];

    if (currentPit === startIndex) continue; 

    tableau[currentPit]++;
    seeds--;

    await animatePit(currentPit, tableau[currentPit]);
  }

  await checkCaptures(currentPit);

  await fetch("songo.php?action=jouer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tableau, scores, current_player: currentPlayer }),
  });

  isAnimating = false;
}

//Verifie si le joueur peux capturer
async function checkCaptures(lastPit) {
  let captured = 0;
  let pathIdx = path.indexOf(lastPit);

  const oppCamp = currentPlayer === 1
    ? new Set([1, 2, 3, 4, 5, 6, 7])
    : new Set([16, 15, 14, 13, 12, 11, 10]);
  const oppFirstPit = currentPlayer === 1 ? 1 : 16;

  while (true) {
    const pit = path[pathIdx];

    if (!oppCamp.has(pit)) break;
    if (pit === oppFirstPit && captured === 0) break;

    if (tableau[pit] >= 2 && tableau[pit] <= 4) {
      captured += tableau[pit];
      tableau[pit] = 0;
      await animatePit(pit, 0);
      pathIdx = (pathIdx - 1 + path.length) % path.length;
    } else {
      break;
    }
  }

  if (captured > 0) {
    scores[currentPlayer] += captured;
    updateScoresUI();

    if (scores[currentPlayer] >= 35) {
      setTimeout(() => {
        alert(`Victoire ! Le Joueur ${currentPlayer} a atteint ${scores[currentPlayer]} points !`);
        isAnimating = true;
      }, 300);
      return;
    }
  }

  currentPlayer = currentPlayer === 1 ? 2 : 1;
  updateTurnUI();
}

//Mise a jour des scores
function updateScoresUI() {
  pits[0].innerHTML = `<div style="font-weight:bold; color:black; display: flex; flex-direction: column; gap: 5px; align-items: center; justify-content:center; padding: 5px;"> Joueur 2 <span style="font-size: 2rem; color: #a37027"> ${scores[2]}</span></div>`;
  pits[17].innerHTML = `<div style="font-weight:bold; color:black; text-align: center; padding: 5px;  display: flex; flex-direction: column; gap: 5px; align-items: center; justify-content:center;"> Joueur 1 <span style="font-size: 2rem; color: #a37027"> ${scores[1]}</span></div>`;
}

//Reduire l'opacite du joueur attendant
function updateTurnUI() {
  let turnText = `Tour du Joueur ${currentPlayer}`;
  if (pret) {
    turnText += currentPlayer === role ? " - Votre tour" : " - Attente de l'adversaire";
  }
  document.querySelector(".tour").innerText = turnText;

  path.forEach(index => {
    pits[index].style.opacity = (currentPlayer === 1 && index >= 10) || (currentPlayer === 2 && index <= 7) ? "1" : "0.7";
  });
}

//Animation
function animatePit(index, newValue) {
  return new Promise(resolve => {
    if (deadPits.has(index)) {
      resolve();
      return;
    }

    const element = pits[index];
    let circle = element.querySelector(".circle");

    if (newValue === 0) {
      if (circle) circle.remove();
      resolve();
      return;
    }

    if (!circle) {
      circle = document.createElement("div");
      circle.className = "circle";
      element.appendChild(circle);
    }

    gsap.to(circle, {
      scale: 2,
      duration: 0.2,
      yoyo: true,
      repeat: 1,
      ease: "power1.inOut",
      onComplete: () => {
        circle.innerText = newValue;
        resolve();
      },
    });
  });
}