(function($) {
  const table = document.querySelector('table');const tBody = table.tBodies[0];const headerCells = table.tHead.rows[0].cells;const iconCells = table.tHead.rows[1].cells;const rows = Array.from(tBody.rows);
  for (const th of headerCells) {const cellIndex = th.cellIndex;if ( (th.innerText.toLocaleUpperCase() == 'NAME') || (th.innerText.toLocaleUpperCase() == 'HOMETOWN') || (th.innerText.toLocaleUpperCase() == 'POSITION') ) {th.onclick = () => {iconCells[cellIndex].childNodes[0].style.display = 'inline-block';ResetHeaderIcons(cellIndex);rows.sort( (tr1, tr2) => {const tr1text = tr1.cells[cellIndex].textContent;const tr2text = tr2.cells[cellIndex].textContent;let result = tr1text.localeCompare(tr2text);if (result == 0) {if ( headerCells[0].innerText == '#' && tr1.cells[0].textContent != '' && tr2.cells[0].textContent != ''){return parseInt(tr1.cells[0].textContent) - parseInt(tr2.cells[0].textContent);}else { return result }}else return result;});tBody.append(...rows);};iconCells[cellIndex].onclick = th.onclick;}else if((th.innerText == '#')||(th.innerText.toLocaleUpperCase()=='GRAD')){th.onclick=()=>{iconCells[cellIndex].childNodes[0].style.display = 'inline-block';ResetHeaderIcons(cellIndex);rows.sort( (tr1, tr2) => {return parseInt(tr1.cells[cellIndex].textContent) - parseInt(tr2.cells[cellIndex].textContent);});tBody.append(...rows);};iconCells[cellIndex].onclick = th.onclick;if (th.innerText.toLocaleUpperCase() == '#') {th.click();}}}
  function ResetHeaderIcons(cIndex){for (const th of iconCells) {if (th.cellIndex != cIndex) { th.childNodes[0].style.display = 'none'; }};}
})(jQuery);