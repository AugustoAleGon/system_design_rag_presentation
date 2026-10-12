document.querySelectorAll<HTMLElement>('[data-chunk-lab]').forEach(lab => {
 const buttons = Array.from(lab.querySelectorAll<HTMLButtonElement>('[data-chunk-method]'));
 buttons.forEach(button => button.addEventListener('click', () => {
  const method = button.dataset.chunkMethod!;
  lab.dataset.method = method;
  buttons.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
  lab.querySelectorAll<HTMLElement>('[data-chunk-panel]').forEach(panel => {
   panel.hidden = panel.dataset.chunkPanel !== method;
  });
 }));
});
