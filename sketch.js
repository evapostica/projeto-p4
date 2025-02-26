let bodyPose;
let video;
// array com as poses detetadas - cada pose e uma pessoa diferente
let poses = [];
let images = [];

let imgIndex = 0;
// variavel para contar o tempo minimo para se considerar que alguem esta a ver a noticia
let inViewTime = null;

// states - waitingForPerson, timerPersonInView, personInView, personLeaving
let currentState = 'waitingForPerson';
let previousState = 'waitingForPerson';


function preload() {
  for (let i = 0; i <= 10; i++) {
    images.push(loadImage(`imgs/noticia_A_${i}.png`));
  }
}

function setup() {
  // tamanho do feednplay / 4
  createCanvas(2430, 480);
  // iniciar captura de video 
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();
  // iniciar reconhecimento de poses
  bodyPose = ml5.bodyPose(video, modelReady);
}

// deteta as poses e envias pra funcao gotPoses
function modelReady() {
  console.log('[SYSTEM] Bodypose model loaded');
  bodyPose.detectStart(video, gotPoses);
}

// colocar as poses obtidas no array poses
function gotPoses(results) {
  poses = results;
}

function draw() {
  // display da imagem a cada frame, começa na img 0
  image(images[imgIndex], 0, 0, width, height);

  // verificar se houve alteracoes no video captado pela camara (entrada e saida de pessoas, ...)
  checkActivity();

  // update dos estados a cada frame
  previousState = currentState;
}


function checkActivity() {
  // se ha alguem a frente da camara
  if (poses.length > 0) {
    // primeira pessoa detetada
    let pose = poses[0];
    
    // se o feednplay estiver a espera de uma pessoa 
    // começa o timer para verificar se a pessoa esta a ver a noticia
    if (currentState === 'waitingForPerson') {
      inViewTime = millis();
      // mudar o estado para o timer
      currentState = 'timerPersonInView';
      console.log(`[DETECTION] Person entered view at ${getTimestamp()} - timer started`);
    }
    // se estiver no estado do timer
    else if (currentState === 'timerPersonInView') {
      // e a pessoa passar 5s a frente do feednplay
      if (millis() - inViewTime >= 5000) {
        // assumir que a pessoa esta a ver a noticia
        currentState = 'personInView';
        // reset do timer
        inViewTime = null;
        console.log(`[TIMER] Finished 5-second timer - someone is watching`);
      }
    }
    // se a pessoa estiver a ver a noticia
    else if (currentState === 'personInView') {
      // e comecar a ir embora
      if (personIsLeaving(pose) && poses.length == 1) {
        if (imgIndex < 10) {
          imgIndex++;
        }
        // se for a ultima imagem, volta a primeira
        else {
          imgIndex = 0;
        }
        // mudar o estado para se possivel que a pessoa volte atras para ver a nova noticia, garatindo que a 
        // noticia so muda 1 vez por espectador
        currentState = 'personLeaving';
        console.log(`[DETECTION] Person leaving at ${getTimestamp()} - changing image to noticia_A_${imgIndex}`);
      }
    }

  }
  // se ja nao ha ninguem a frente da camara
  else {
    // se a pessoa so passou em frente da camara, menos de 5s, continua a espera que alguem pare para ver
    if (currentState === 'timerPersonInView') {
      currentState = 'waitingForPerson';
      // reset do timer
      inViewTime = null;
      console.log(`[RESTART] Reset timer at ${getTimestamp()} - person left before 5 seconds`);
    }
    // so depois da pessoa sair totalmente do ecra e que a noticia pode mudar de novo, quando outra pessoa olhar para o ecra
    else if (currentState === 'personLeaving') {
      currentState = 'waitingForPerson';
      console.log(`[DETECTION] Person left view at ${getTimestamp()} - waiting for someone`);
    }
    
  }

}

// mostrar mudancas de estado - apenas para debug
function logStateChanges() {
  if (previousState !== currentState) {
    console.log(`[STATE CHANGE] ${previousState} → ${currentState}`);
  }
}

// funcao que devolve o tempo exato nesse momento - apenas para debug
function getTimestamp() {
  return new Date().toLocaleTimeString();
}

// funcao para verificar se a pessoa esta a ir embora do feednplay
function personIsLeaving(pose) {
  // como os espectadores olham para a tela, utilizar o keypoint do nariz para verificar a posicao da pessoa
  let x = pose.nose.x;
  // os limites para a pessoa ir embora são passar de menos de 30% (esquerda) ou mais 70% (direita) da tela do feednplay
  let limit = width * 0.3;
  // devolve verdadeiro se a pessoa tiver passado dos limites - esta a ir embora
  if (x < limit || x > width - limit) {
    console.log(`[LIMIT] Person leaving - X:${x.toFixed(1)}`);
    return true;
  }
  // devolve falso se a pessoa estiver dentro dos limites - esta a ver
  return false;
}