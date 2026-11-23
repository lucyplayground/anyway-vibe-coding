const form = document.querySelector('#palette-form');
const input = document.querySelector('#keyword');
const generateButton = document.querySelector('#generate');
const shuffleButton = document.querySelector('#shuffle');
const output = document.querySelector('.palette-output');
const status = document.querySelector('#status');
const caption = document.querySelector('#palette-caption');
let busy = false;

async function generate() {
  if (busy) return;
  if (location.protocol === 'file:') {
    status.textContent = 'API를 사용하려면 README의 안내대로 서버를 실행하고 http://127.0.0.1:3000에서 열어 주세요.';
    return;
  }
  const keyword = input.value.trim();
  if (!keyword || keyword.length > 100) {
    status.textContent = '단어를 1~100자로 입력해 주세요.';
    input.focus();
    return;
  }
  busy = true;
  generateButton.disabled = true;
  shuffleButton.disabled = true;
  output.setAttribute('aria-busy', 'true');
  status.textContent = '어울리는 색상 다섯 개를 찾고 있어요… 응답이 늦으면 자동으로 다시 시도해요.';
  try {
    const response = await fetch('/api/palette', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword }),
      signal: AbortSignal.timeout(100_000),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '색상을 생성하지 못했어요.');
    if (!Array.isArray(data.colors) || data.colors.length !== 5 ||
        !data.colors.every(color => /^#[0-9a-f]{6}$/i.test(color))) {
      throw new Error('색상 응답이 올바르지 않아요. 다시 시도해 주세요.');
    }
    const swatches = data.colors.map(color => {
      const item = document.createElement('div');
      item.className = 'palette-color';
      const square = document.createElement('div');
      square.className = 'color-square';
      square.style.backgroundColor = color;
      square.setAttribute('role', 'img');
      square.setAttribute('aria-label', `색상 ${color}`);
      const code = document.createElement('span');
      code.textContent = color.toUpperCase();
      item.append(square, code);
      return item;
    });
    output.replaceChildren(...swatches);
    output.classList.add('has-colors');
    caption.textContent = `“${keyword}”의 색상`;
    status.textContent = data.fallback
      ? `기본 모델이 응답하지 않아 대체 모델(${data.model})로 만들었어요. 셔플을 누르면 새로운 조합을 제안해요.`
      : '팔레트를 만들었어요. 셔플을 누르면 새로운 조합을 제안해요.';
  } catch (error) {
    status.textContent = error.name === 'TimeoutError'
      ? '응답이 오래 걸리고 있어요. 다시 시도해 주세요.'
      : error instanceof TypeError || error instanceof SyntaxError
        ? '서버에 연결하지 못했어요. 서버 실행 상태를 확인해 주세요.'
        : error.message;
  } finally {
    busy = false;
    generateButton.disabled = false;
    shuffleButton.disabled = false;
    output.setAttribute('aria-busy', 'false');
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  generate();
});
shuffleButton.addEventListener('click', generate);
