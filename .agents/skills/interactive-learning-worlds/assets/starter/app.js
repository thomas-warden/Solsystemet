(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const missionIds = ['compare', 'reveal', 'order'];
  const missions = {
    compare: { kind: 'Compare sizes', title: 'Find the fit.', instruction: 'Move the slider until the blue circle fits the outline. Then check your match.', badge: 'Size Finder', symbol: '◎', success: 'You changed one size and compared it with another.' },
    reveal: { kind: 'Reveal a hidden shape', title: 'Look underneath.', instruction: 'Lift the cover. Look at the shape before choosing your answer.', badge: 'Hidden Star', symbol: '✦', success: 'You looked underneath before deciding what was there.' },
    order: { kind: 'Order three samples', title: 'Small to large.', instruction: 'Use the arrows to move each sample. Put the smallest first and the largest last.', badge: 'Order Builder', symbol: '▥', success: 'You compared all three samples and put them in order.' }
  };
  const samples = {
    small: { name: 'Orange', size: 30, color: '#dc8168' },
    medium: { name: 'Teal', size: 52, color: '#416c77' },
    large: { name: 'Gold', size: 76, color: '#edba68' }
  };
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let motion = !media.matches;
  let active = null;
  let state = null;
  let config = null;
  let storageAvailable = true;
  let badges = new Set();
  const storageKey = 'learning-worlds:badges:v1:' + location.pathname.replace(/[^/]*$/, '');

  function setMotion(value) {
    motion = value;
    document.body.classList.toggle('motion-on', motion);
    $('motionButton').textContent = motion ? 'Pause motion' : 'Start motion';
    $('motionButton').setAttribute('aria-pressed', String(motion));
  }
  $('motionButton').addEventListener('click', () => setMotion(!motion));
  media.addEventListener('change', event => { if (event.matches) setMotion(false); });
  setMotion(motion);

  function readBadges() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(saved)) badges = new Set(saved.filter(id => missionIds.includes(id)));
      // Detect blocked writes before promising that badges will last.
      localStorage.setItem(storageKey, JSON.stringify([...badges]));
    } catch { storageAvailable = false; }
  }
  function showBadges() {
    for (const id of missionIds) {
      const element = document.querySelector('[data-badge="' + id + '"]');
      element.classList.toggle('collected', badges.has(id));
      element.lastElementChild.textContent = missions[id].badge + (badges.has(id) ? ' · collected' : ' · not collected yet');
    }
    $('badgeCount').textContent = badges.size + ' of 3 badges collected';
    $('saveNote').textContent = storageAvailable ? 'Your badges will be here next time.' : 'Your badges stay here while this page is open.';
  }
  function saveBadge(id) {
    badges.add(id);
    if (storageAvailable) {
      try { localStorage.setItem(storageKey, JSON.stringify([...badges])); }
      catch { storageAvailable = false; }
    }
    showBadges();
  }
  readBadges();

  function validContent(value) {
    return value && value.schemaVersion === 1 && ['title', 'topic', 'intro'].every(key => typeof value[key] === 'string' && value[key].trim()) &&
      Array.isArray(value.ageRange) && value.ageRange.length === 2 && value.ageRange.every(age => Number.isInteger(age) && age >= 1 && age <= 120) &&
      value.ageRange[0] <= value.ageRange[1] && ['prototype', 'ready'].includes(value.status) &&
      Array.isArray(value.learningGoals) && value.learningGoals.length === 3 && value.learningGoals.every(goal => typeof goal === 'string' && goal.trim()) &&
      Array.isArray(value.sourceIds) && value.sourceIds.every(id => typeof id === 'string');
  }
  async function loadContent() {
    const retrying = !$('errorPanel').hidden;
    $('app').hidden = true; $('errorPanel').hidden = true; $('loadingPanel').hidden = false;
    $('loadRetry').disabled = true;
    try {
      const response = await fetch('./content.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Content request failed');
      const value = await response.json();
      if (!validContent(value)) throw new Error('Invalid content');
      config = value;
      document.title = config.title;
      $('appTitle').textContent = config.title; $('intro').textContent = config.intro; $('topic').textContent = config.topic;
      document.querySelectorAll('[data-goal]').forEach(element => { element.textContent = config.learningGoals[Number(element.dataset.goal)]; });
      showBadges(); $('app').hidden = false;
      if (retrying) $('homeTitle').focus();
    } catch {
      $('errorPanel').hidden = false; $('errorTitle').focus();
    } finally {
      $('loadingPanel').hidden = true; $('loadRetry').disabled = false;
    }
  }
  $('loadRetry').addEventListener('click', loadContent);

  function feedback(message) { $('feedback').textContent = message; }
  function showSize() {
    const size = Number($('sizeSlider').value);
    $('sizeCircle').setAttribute('r', String(size * .8));
    $('sizeValue').textContent = size + ' units';
    $('sizeSlider').setAttribute('aria-valuetext', size + ' units wide');
    $('compareScene').setAttribute('aria-label', 'A blue circle ' + size + ' units wide over an outline 64 units wide.');
  }
  function startMission(id) {
    if (!config || !missionIds.includes(id)) return;
    active = id;
    state = { finished: false, adjusted: false, revealed: false, moved: false, order: ['medium', 'large', 'small'] };
    $('home').hidden = true; $('workbench').hidden = false;
    $('missionKind').textContent = missions[id].kind;
    $('missionTitle').textContent = missions[id].title;
    $('missionInstruction').textContent = missions[id].instruction;
    $('missionStep').textContent = id === 'reveal' ? 'Step 1 of 2 · Look first' : 'Try it, then check';
    for (const key of missionIds) $(key + 'Panel').hidden = key !== id;
    $('completionPanel').hidden = true; $('retryMission').hidden = false;
    $('sizeSlider').value = '32'; showSize();
    $('revealScene').classList.remove('revealed');
    $('revealScene').setAttribute('aria-label', 'A shape is hidden beneath a round cover.');
    $('liftCover').hidden = false; $('shapeAnswers').hidden = true;
    buildOrder(); feedback('');
    $('missionTitle').focus(); $('workbench').scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function leaveMission() {
    active = null; state = null;
    $('workbench').hidden = true; $('home').hidden = false;
    $('homeTitle').focus(); $('homeTitle').scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function finishMission() {
    if (!active || state.finished) return;
    state.finished = true; saveBadge(active);
    $(active + 'Panel').hidden = true; feedback('');
    $('missionStep').textContent = 'Activity complete';
    $('missionTitle').textContent = 'You did it.';
    $('missionInstruction').textContent = 'You made the discovery yourself.';
    $('earnedSymbol').textContent = missions[active].symbol;
    $('completionTitle').textContent = missions[active].badge + ' collected!';
    $('completionCopy').textContent = missions[active].success;
    $('completionPanel').hidden = false; $('completionTitle').focus();
  }
  document.querySelectorAll('[data-start]').forEach(button => button.addEventListener('click', () => startMission(button.dataset.start)));
  $('leaveMission').addEventListener('click', leaveMission);
  $('chooseNext').addEventListener('click', leaveMission);
  $('retryMission').addEventListener('click', () => startMission(active));
  $('sizeSlider').addEventListener('input', () => {
    if (active !== 'compare' || state.finished) return;
    state.adjusted = true; showSize(); feedback('');
  });
  $('checkSize').addEventListener('click', () => {
    if (active !== 'compare' || state.finished) return;
    if (!state.adjusted) return feedback('Move the slider first. You are in charge of the blue circle.');
    if (Math.abs(Number($('sizeSlider').value) - 64) <= 2) finishMission();
    else feedback('Keep comparing the edges. Try making the blue circle a little ' + (Number($('sizeSlider').value) < 64 ? 'larger.' : 'smaller.'));
  });
  $('liftCover').addEventListener('click', () => {
    if (active !== 'reveal' || state.finished || state.revealed) return;
    state.revealed = true; $('revealScene').classList.add('revealed');
    $('revealScene').setAttribute('aria-label', 'The cover is lifted. A star with five points is visible.');
    $('liftCover').hidden = true; $('shapeAnswers').hidden = false;
    $('missionStep').textContent = 'Step 2 of 2 · Choose an answer';
    $('missionTitle').textContent = 'What was hiding?';
    $('missionInstruction').textContent = 'Look at the uncovered shape. Which name fits it?';
    $('missionTitle').focus();
  });
  document.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
    if (active !== 'reveal' || state.finished || !state.revealed) return;
    if (button.dataset.answer === 'star') finishMission();
    else feedback('Take another look at the points. You can choose again.');
  }));

  function buildOrder() {
    $('sampleList').replaceChildren();
    for (const id of state.order) {
      const sample = samples[id], row = document.createElement('li');
      row.className = 'sample-row'; row.dataset.sample = id;
      const position = document.createElement('span'); position.className = 'sample-position'; position.setAttribute('aria-hidden', 'true');
      const picture = document.createElement('div'); picture.className = 'sample-picture'; picture.setAttribute('aria-hidden', 'true');
      const dot = document.createElement('i'); dot.className = 'sample-dot'; dot.style.setProperty('--size', sample.size + 'px'); dot.style.setProperty('--color', sample.color); picture.append(dot);
      const name = document.createElement('p'); name.className = 'sample-name'; name.textContent = sample.name;
      const size = document.createElement('small'); size.textContent = sample.size + ' units'; name.append(size);
      const controls = document.createElement('div'); controls.className = 'move-buttons';
      for (const direction of [-1, 1]) {
        const button = document.createElement('button'); button.type = 'button';
        button.dataset.direction = String(direction); button.setAttribute('aria-label', 'Move ' + sample.name + (direction < 0 ? ' earlier' : ' later'));
        button.addEventListener('click', () => moveSample(id, direction)); controls.append(button);
      }
      row.append(position, picture, name, controls); $('sampleList').append(row);
    }
    updateOrder();
  }
  function updateOrder() {
    state.order.forEach((id, index) => {
      const row = $('sampleList').querySelector('[data-sample="' + id + '"]');
      $('sampleList').append(row); row.querySelector('.sample-position').textContent = String(index + 1);
      row.querySelector('[data-direction="-1"]').disabled = index === 0;
      row.querySelector('[data-direction="1"]').disabled = index === state.order.length - 1;
    });
  }
  function moveSample(id, direction) {
    if (active !== 'order' || state.finished) return;
    const index = state.order.indexOf(id), next = index + direction;
    if (next < 0 || next >= state.order.length) return;
    state.order.splice(index, 1); state.order.splice(next, 0, id); state.moved = true;
    updateOrder();
    const row = $('sampleList').querySelector('[data-sample="' + id + '"]');
    const preferred = row.querySelector('[data-direction="' + direction + '"]');
    (preferred.disabled ? row.querySelector('button:not(:disabled)') : preferred).focus();
    feedback(samples[id].name + ' is now number ' + (next + 1) + ' in the order.');
  }
  $('checkOrder').addEventListener('click', () => {
    if (active !== 'order' || state.finished) return;
    if (!state.moved) return feedback('Use the arrows to move a sample, then check your order.');
    if (state.order.join(',') === 'small,medium,large') finishMission();
    else feedback('Start with the smallest circle. Each next circle should be larger.');
  });
  loadContent();
})();
