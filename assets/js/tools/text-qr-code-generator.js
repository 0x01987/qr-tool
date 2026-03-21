document.addEventListener('DOMContentLoaded', () => {

  const textInput = document.getElementById('textInput');
  const generateBtn = document.getElementById('generateBtn');
  const sampleBtn = document.getElementById('sampleBtn');
  const clearBtn = document.getElementById('clearBtn');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const canvas = document.getElementById('qrCanvas');
  const year = document.getElementById('year');

  if(year){
    year.textContent = new Date().getFullYear();
  }

  function generateQR(text){
    if(!text){
      QRCode.toCanvas(canvas, ' ', { width:300 });
      return;
    }

    QRCode.toCanvas(canvas, text, {
      width:300,
      margin:2,
      errorCorrectionLevel:'M'
    });
  }

  generateBtn.addEventListener('click', () => {
    generateQR(textInput.value.trim());
  });

  sampleBtn.addEventListener('click', () => {
    textInput.value = "Hello from InstantQR 🚀\nFast • Free • Simple QR Codes";
    generateQR(textInput.value);
  });

  clearBtn.addEventListener('click', () => {
    textInput.value = '';
    generateQR('');
  });

  copyBtn.addEventListener('click', async () => {
    if(!textInput.value.trim()){
      alert('Nothing to copy');
      return;
    }

    try{
      await navigator.clipboard.writeText(textInput.value);
      copyBtn.textContent = "Copied";
      setTimeout(()=>copyBtn.textContent="Copy Text",1200);
    }catch{
      alert('Copy failed');
    }
  });

  downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'text-qr-code.png';
    link.click();
  });

  // auto-generate on input
  textInput.addEventListener('input', () => {
    generateQR(textInput.value.trim());
  });

  // initial
  generateQR('');

});
