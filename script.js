// ================== ELEMENTS ==================
var bookIcon         = document.getElementById('bookIcon');
var sidebar          = document.getElementById('sidebar');

var plusButton       = document.getElementById('plusButton');
var searchButton     = document.getElementById('searchButton');
var customizeButton  = document.getElementById('customizeButton');

var plusMenu         = document.getElementById('plusMenu');
var plusOptions      = document.getElementById('plusOptions');
var addQuoteButton   = document.getElementById('addQuoteButton');
var quoteForm        = document.getElementById('quoteForm');
var cancelQuoteBtn   = document.getElementById('cancelQuote');

var searchBox        = document.getElementById('searchBox');
var searchInput      = document.getElementById('searchInput');
var noResultsMessage = document.getElementById('noResultsMessage');

var customizeMenu    = document.getElementById('customizeMenu');
var themeToggleInput = document.getElementById('themeToggleInput');

var addWriteButton   = document.getElementById('addWriteButton');
var writeModal       = document.getElementById('writeModal');
var writeForm        = document.getElementById('writeForm');
var cancelWrite      = document.getElementById('cancelWrite');

var addVisualButton  = document.getElementById('addVisualButton');

var tagCreateForm    = document.getElementById('tagCreateForm');
var newTagName       = document.getElementById('newTagName');
var tagList          = document.getElementById('tagList');
var tagLimitMsg      = document.getElementById('tagLimitMsg');
var tagFilterBar     = document.getElementById('tagFilterBar');

var boardGrid        = document.getElementById('boardGrid');
var emptyBoardMsg    = document.getElementById('emptyBoardMessage');

// ================== STATE ==================
var isBookOpen = false;
var seqCounter = 0;
var editingWriteId = null;
var activeTagFilter = null;

// ================== THEME ==================
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('theme', theme); } catch (_) {}
  if (themeToggleInput) themeToggleInput.checked = (theme === 'dark');
}
(function initTheme(){
  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch (_) {}
  var sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (sysDark ? 'dark' : 'light'));
})();
if (themeToggleInput) {
  themeToggleInput.addEventListener('change', function(e){
    applyTheme(e.target.checked ? 'dark' : 'light');
  });
}

// ================== PANELS ==================
function showPanel(which) {
  // hide all panels
  if (plusMenu) plusMenu.classList.add('hidden');
  if (searchBox) searchBox.classList.add('hidden');
  if (customizeMenu) customizeMenu.classList.add('hidden');
  if (plusOptions) plusOptions.classList.add('hidden');
  if (quoteForm) quoteForm.classList.add('hidden');

  // show buttons if null
  var showButtons = !which;
  if (plusButton) plusButton.classList.toggle('hidden', !showButtons);
  if (searchButton) searchButton.classList.toggle('hidden', !showButtons);
  if (customizeButton) customizeButton.classList.toggle('hidden', !showButtons);

  if (!which) {
    resetSearchUI();
    return;
  }

  if (which === 'plus' && plusMenu) {
    plusMenu.classList.remove('hidden');
    if (plusOptions) plusOptions.classList.remove('hidden');
  }
  if (which === 'search' && searchBox) {
    searchBox.classList.remove('hidden');
    if (searchInput) {
      searchInput.value = '';
      setTimeout(function(){ searchInput.focus(); }, 0);
    }
    applyFilters();
  }
  if (which === 'customize' && customizeMenu) {
    customizeMenu.classList.remove('hidden');
  }
}

function resetSidebarToDefault() {
  showPanel(null);
  if (customizeMenu) customizeMenu.classList.add('hidden');
}

// ================== SIDEBAR OPEN/CLOSE ==================
function positionSidebar() {
  if (!bookIcon || !sidebar) return;
  var r = bookIcon.getBoundingClientRect();
  var gap = 8;
  sidebar.style.top  = (r.bottom + window.scrollY + gap) + 'px';
  sidebar.style.left = (r.left + window.scrollX) + 'px';
}

if (bookIcon) {
  bookIcon.addEventListener('click', function(){
    isBookOpen = !isBookOpen;
    bookIcon.src = isBookOpen ? 'images/open-book-icon.jpg' : 'images/close-book-icon.jpg';
    if (isBookOpen) {
      positionSidebar();
      if (sidebar) {
        sidebar.classList.remove('hidden');
        sidebar.classList.add('open');
      }
      resetSidebarToDefault();
      resetSearchUI();
    } else {
      if (sidebar) sidebar.classList.remove('open');
      resetSearchUI();
    }
  });
}

document.addEventListener('click', function(e){
  if (!isBookOpen || !sidebar) return;
  var inside = sidebar.contains(e.target);
  var isIcon = e.target === bookIcon;
  if (!inside && !isIcon) {
    isBookOpen = false;
    sidebar.classList.remove('open');
    if (bookIcon) bookIcon.src = 'images/close-book-icon.jpg';
  }
});

window.addEventListener('resize', function(){ if (isBookOpen) positionSidebar(); });
window.addEventListener('scroll', function(){ if (isBookOpen) positionSidebar(); }, { passive:true });

// ================== BUTTONS ==================
if (plusButton) plusButton.addEventListener('click', function(){
  var opening = plusMenu && plusMenu.classList.contains('hidden');
  if (customizeMenu) customizeMenu.classList.add('hidden');
  showPanel(opening ? 'plus' : null);
});
if (searchButton) searchButton.addEventListener('click', function(){
  var opening = searchBox && searchBox.classList.contains('hidden');
  if (customizeMenu) customizeMenu.classList.add('hidden');
  showPanel(opening ? 'search' : null);
});
if (customizeButton) customizeButton.addEventListener('click', function(){
  var opening = customizeMenu && customizeMenu.classList.contains('hidden');
  showPanel(opening ? 'customize' : null);
});

// ================== SEARCH + TAG FILTER ==================
function getCardSearchText(card) {
  if (card.classList.contains('quote-card')) {
    var text   = (card.querySelector('.quote-text')  || {}).textContent || '';
    var author = (card.querySelector('.quote-author')|| {}).textContent || '';
    var book   = (card.querySelector('.quote-book')  || {}).textContent || '';
    return (text + ' ' + author + ' ' + book).toLowerCase();
  }
  if (card.classList.contains('write-card')) {
    var full = card.dataset.fullText || ((card.querySelector('.write-text') || {}).textContent || '');
    return full.toLowerCase();
  }
  if (card.classList.contains('visual-card')) {
    return (card.dataset.alt || '').toLowerCase();
  }
  return (card.textContent || '').toLowerCase();
}

function reorderBoardForSearch(active) {
  if (!boardGrid) return;
  var cards = boardGrid.children;
  var arr = Array.prototype.slice.call(cards);
  function bySeq(a, b) { return (+a.dataset.seq) - (+b.dataset.seq); }

  if (!active) {
    arr.sort(bySeq).forEach(function(c){ boardGrid.appendChild(c); });
    return;
  }

  var matches = [];
  var nonmatches = [];
  for (var i=0;i<arr.length;i++){
    var c = arr[i];
    var hidden = c.classList.contains('hidden-by-search') || c.classList.contains('hidden-by-tag');
    (hidden ? nonmatches : matches).push(c);
  }
  matches.sort(bySeq).forEach(function(c){ boardGrid.appendChild(c); });
  nonmatches.sort(bySeq).forEach(function(c){ boardGrid.appendChild(c); });
}

function applyFilters() {
  var q = (searchInput && searchInput.value ? searchInput.value : '').trim().toLowerCase();
  var cards = document.querySelectorAll('#boardGrid .board-card');
  var visibleCount = 0;

  for (var i=0;i<cards.length;i++){
    var card = cards[i];
    var matchesSearch = !q || getCardSearchText(card).includes(q);
    var tags = getCardTags(card);
    var matchesTag = !activeTagFilter || tags.indexOf(activeTagFilter) !== -1;

    var visible = matchesSearch && matchesTag;

    card.classList.toggle('hidden-by-search', !!q && !matchesSearch);
    card.classList.toggle('hidden-by-tag', !!activeTagFilter && !matchesTag);

    if (visible) visibleCount++;
  }

  reorderBoardForSearch(q || activeTagFilter ? 'active' : '');

  if (noResultsMessage) noResultsMessage.classList.toggle('hidden', visibleCount > 0);
}

if (searchInput) {
  searchInput.addEventListener('input', applyFilters);
  searchInput.addEventListener('keydown', function(e){
    if (e.key === 'Escape') {
      searchInput.value = '';
      applyFilters();
    }
  });
}

function resetSearchUI() {
  if (noResultsMessage) noResultsMessage.classList.add('hidden');
  if (searchInput) searchInput.value = '';
  activeTagFilter = null;
  renderTagFilterBar();
  var cards = document.querySelectorAll('#boardGrid .board-card');
  for (var i=0;i<cards.length;i++){
    cards[i].classList.remove('hidden-by-search', 'hidden-by-tag');
  }
  reorderBoardForSearch('');
}

// ================== QUOTES ==================
if (addQuoteButton) {
  addQuoteButton.addEventListener('click', function(){
    if (plusOptions) plusOptions.classList.add('hidden');
    if (quoteForm) quoteForm.classList.remove('hidden');
  });
}
if (quoteForm) {
  quoteForm.addEventListener('submit', function(e){
    e.preventDefault();
    var quoteText   = (document.getElementById('quoteText')   || {}).value || '';
    var quoteAuthor = (document.getElementById('quoteAuthor') || {}).value || '';
    var quoteBook   = (document.getElementById('quoteBook')   || {}).value || '';
    quoteText = quoteText.trim();
    if (!quoteText) return;

    addQuoteToBoard(quoteText, (quoteAuthor||'').trim(), (quoteBook||'').trim());
    quoteForm.reset();
    quoteForm.classList.add('hidden');
    if (plusOptions) plusOptions.classList.remove('hidden');
  });
}
if (cancelQuoteBtn) {
  cancelQuoteBtn.addEventListener('click', function(){
    if (quoteForm) quoteForm.classList.add('hidden');
    if (plusOptions) plusOptions.classList.remove('hidden');
  });
}

function makeIconBtn(cls, txt) {
  var b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = txt;
  return b;
}

function addQuoteToBoard(quoteText, quoteAuthor, quoteBook, initialTags) {
  if (!boardGrid) return;
  var card = document.createElement('div');
  card.className = 'board-card quote-card';
  card.dataset.id = (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
  setCardTags(card, Array.isArray(initialTags) ? initialTags : []);
  card.draggable = true;

  var body = document.createElement('div');
  body.className = 'quote-body';

  var block = document.createElement('blockquote');
  block.className = 'quote-text';
  block.textContent = quoteText;

  var cite = document.createElement('cite');
  cite.className = 'quote-cite';
  if (quoteAuthor) {
    var a = document.createElement('span');
    a.className = 'quote-author';
    a.textContent = quoteAuthor;
    cite.appendChild(a);
  }
  if (quoteBook) {
    if (quoteAuthor) cite.appendChild(document.createTextNode(', '));
    var b = document.createElement('em');
    b.className = 'quote-book';
    b.textContent = quoteBook;
    cite.appendChild(b);
  }

  body.appendChild(block);
  body.appendChild(cite);

  var form = document.createElement('form');
  form.className = 'quote-edit-form hidden';
  form.innerHTML =
    '<textarea class="edit-text" required maxlength="300" placeholder="Enter quote..."></textarea>' +
    '<input class="edit-author" type="text" maxlength="100" placeholder="Author" />' +
    '<input class="edit-book"   type="text" maxlength="100" placeholder="Book" />' +
    '<div class="edit-actions">' +
      '<button type="submit" class="save">Save</button>' +
      '<button type="button" class="cancel">Cancel</button>' +
    '</div>';
  form.querySelector('.edit-text').value   = quoteText;
  form.querySelector('.edit-author').value = quoteAuthor || '';
  form.querySelector('.edit-book').value   = quoteBook || '';

  var overlay = document.createElement('div');
  overlay.className = 'card-overlay';
  var tagBtn    = makeIconBtn('card-tag-button', '🏷️');
  var editBtn   = makeIconBtn('card-edit', '✏️');
  var deleteBtn = makeIconBtn('card-delete', '🗑️');
  overlay.appendChild(tagBtn);
  overlay.appendChild(editBtn);
  overlay.appendChild(deleteBtn);

  card.appendChild(body);
  card.appendChild(form);
  card.appendChild(overlay);
  boardGrid.appendChild(card);

  renderCardTags(card);
  updateEmptyBoardMessage();
  wireCardDnD(card);

  tagBtn.addEventListener('click', function(e){ e.stopPropagation(); openTagPicker(card, tagBtn); });
  editBtn.addEventListener('click', function(){
    body.classList.add('hidden'); form.classList.remove('hidden'); overlay.classList.add('hidden');
    form.querySelector('.edit-text').focus();
  });
  form.querySelector('.cancel').addEventListener('click', function(){
    form.classList.add('hidden'); body.classList.remove('hidden'); overlay.classList.remove('hidden');
  });
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var newText   = form.querySelector('.edit-text').value.trim();
    var newAuthor = form.querySelector('.edit-author').value.trim();
    var newBook   = form.querySelector('.edit-book').value.trim();

    block.textContent = newText;
    cite.textContent = '';
    if (newAuthor) {
      var aa = document.createElement('span');
      aa.className = 'quote-author';
      aa.textContent = newAuthor;
      cite.appendChild(aa);
    }
    if (newBook) {
      if (newAuthor) cite.appendChild(document.createTextNode(', '));
      var bb = document.createElement('em');
      bb.className = 'quote-book';
      bb.textContent = newBook;
      cite.appendChild(bb);
    }
    form.classList.add('hidden'); body.classList.remove('hidden'); overlay.classList.remove('hidden');
    saveBoardToStorage();
  });
  deleteBtn.addEventListener('click', function(){
    card.remove(); saveBoardToStorage(); updateEmptyBoardMessage();
  });

  saveBoardToStorage();
  seqCounter += 1;
  card.dataset.seq = String(seqCounter);
  return card;
}

// ================== WRITE ==================
if (addWriteButton) {
  addWriteButton.addEventListener('click', function(){
    if (writeModal) writeModal.classList.remove('hidden');
    if (plusMenu) plusMenu.classList.add('hidden');
  });
}
if (cancelWrite) {
  cancelWrite.addEventListener('click', function(){
    closeWriteModal(true);
  });
}
if (writeModal) {
  writeModal.addEventListener('click', function(e){
    if (e.target === writeModal) closeWriteModal(true);
  });
}
if (writeForm) {
  writeForm.addEventListener('submit', function(e){
    e.preventDefault();
    var el = document.getElementById('writeText');
    var text = (el && el.value ? el.value.trim() : '');
    if (!text) return;

    if (editingWriteId) {
      var card = document.querySelector('.write-card[data-id="'+editingWriteId+'"]');
      if (card) {
        card.dataset.fullText = text;
        var para = card.querySelector('.write-text');
        if (para) para.textContent = truncate(text, 150);
        saveBoardToStorage();
        var ev = new CustomEvent('write:updated', { bubbles:true, detail:{ id: editingWriteId, text: text } });
        card.dispatchEvent(ev);
      }
    } else {
      addWriteToBoard(text);
    }
    saveBoardToStorage();
    closeWriteModal(true);
  });
}

function closeWriteModal(reset) {
  if (writeModal) writeModal.classList.add('hidden');
  if (reset && writeForm) writeForm.reset();
  editingWriteId = null;
  showPlusMenuHome();
}

function addWriteToBoard(writeText, initialTags) {
  if (!boardGrid) return;
  var card = document.createElement('div');
  card.className = 'board-card write-card';
  card.dataset.id = (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
  card.dataset.fullText = writeText;
  setCardTags(card, Array.isArray(initialTags) ? initialTags : []);
  card.draggable = true;

  var body = document.createElement('div');
  body.className = 'write-body';

  var para = document.createElement('p');
  para.className = 'write-text';
  para.textContent = truncate(writeText, 150);
  body.appendChild(para);

  var overlay = document.createElement('div');
  overlay.className = 'card-overlay';
  var tagBtn    = makeIconBtn('card-tag-button', '🏷️');
  var editBtn   = makeIconBtn('card-edit', '✏️');
  var deleteBtn = makeIconBtn('card-delete', '🗑️');
  overlay.appendChild(tagBtn);
  overlay.appendChild(editBtn);
  overlay.appendChild(deleteBtn);

  card.appendChild(body);
  card.appendChild(overlay);
  boardGrid.appendChild(card);

  renderCardTags(card);
  updateEmptyBoardMessage();
  wireCardDnD(card);

  tagBtn.addEventListener('click', function(e){ e.stopPropagation(); openTagPicker(card, tagBtn); });
  editBtn.addEventListener('click', function(){
    editingWriteId = card.dataset.id;
    var w = document.getElementById('writeText');
    if (w) w.value = card.dataset.fullText || '';
    if (writeModal) writeModal.classList.remove('hidden');
  });
  deleteBtn.addEventListener('click', function(){
    card.remove(); saveBoardToStorage(); updateEmptyBoardMessage();
  });

  saveBoardToStorage();
  seqCounter += 1;
  card.dataset.seq = String(seqCounter);
  return card;
}

function truncate(text, max) {
  if (typeof max !== 'number') max = 150;
  var t = (text || '').trim();
  return t.length > max ? t.slice(0, max) + '...' : t;
}

// ================== VISUALS ==================
var visualPicker = document.createElement('input');
visualPicker.type = 'file';
visualPicker.accept = 'image/*';
visualPicker.multiple = true;
visualPicker.style.display = 'none';
document.body.appendChild(visualPicker);

if (addVisualButton) {
  addVisualButton.addEventListener('click', function(){ visualPicker.click(); });
}
visualPicker.addEventListener('change', function(){
  var files = visualPicker.files ? Array.prototype.slice.call(visualPicker.files) : [];
  if (!files.length) return;

  var i = 0;
  function next() {
    if (i >= files.length) {
      saveBoardToStorage();
      visualPicker.value = '';
      if (plusOptions) plusOptions.classList.remove('hidden');
      if (quoteForm) quoteForm.classList.add('hidden');
      if (plusMenu) plusMenu.classList.remove('hidden');
      return;
    }
    fileToDataURL(files[i]).then(function(dataUrl){
      addVisualToBoard(dataUrl, files[i].name || 'Image');
      i++; next();
    }).catch(function(){ i++; next(); });
  }
  next();
});

function fileToDataURL(file) {
  return new Promise(function(resolve, reject){
    var fr = new FileReader();
    fr.onload = function(){ resolve(fr.result); };
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

function addVisualToBoard(dataUrl, alt, initialTags) {
  if (!boardGrid) return;
  var card = document.createElement('div');
  card.className = 'board-card visual-card';
  card.dataset.id    = (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
  card.dataset.image = dataUrl;
  card.dataset.alt   = alt || '';
  setCardTags(card, Array.isArray(initialTags) ? initialTags : []);
  card.draggable = true;

  var body = document.createElement('div');
  body.className = 'visual-body';

  var img  = document.createElement('img');
  img.className = 'visual-image';
  img.src = dataUrl;
  img.alt = alt || 'Uploaded image';
  body.appendChild(img);

  var overlay = document.createElement('div');
  overlay.className = 'card-overlay';
  var tagBtn    = makeIconBtn('card-tag-button', '🏷️');
  var deleteBtn = makeIconBtn('card-delete', '🗑️');
  overlay.appendChild(tagBtn);
  overlay.appendChild(deleteBtn);

  card.appendChild(body);
  card.appendChild(overlay);
  boardGrid.appendChild(card);

  renderCardTags(card);
  updateEmptyBoardMessage();
  wireCardDnD(card);

  tagBtn.addEventListener('click', function(e){ e.stopPropagation(); openTagPicker(card, tagBtn); });
  deleteBtn.addEventListener('click', function(){
    card.remove(); saveBoardToStorage(); updateEmptyBoardMessage();
  });

  saveBoardToStorage();
  seqCounter += 1;
  card.dataset.seq = String(seqCounter);
  return card;
}

// ================== STORAGE ==================
function saveBoardToStorage() {
  var out = [];
  var cards = document.querySelectorAll('#boardGrid .board-card');
  for (var i=0;i<cards.length;i++){
    var c = cards[i];
    var type = c.classList.contains('quote-card') ? 'quote'
             : c.classList.contains('visual-card') ? 'visual'
             : 'write';
    out.push({
      id: c.dataset.id,
      type: type,
      text:   c.dataset.fullText || ((c.querySelector('.quote-text') || {}).textContent || ''),
      author: ((c.querySelector('.quote-author') || {}).textContent || ''),
      book:   ((c.querySelector('.quote-book')   || {}).textContent || ''),
      image:  c.dataset.image || '',
      alt:    c.dataset.alt || '',
      tags:   getCardTags(c)
    });
  }
  try { localStorage.setItem('boardData', JSON.stringify(out)); } catch (_) {}
}

document.addEventListener('DOMContentLoaded', function(){
  // load board
  var saved = [];
  try { saved = JSON.parse(localStorage.getItem('boardData') || '[]'); } catch (_) {}
  for (var i=0;i<saved.length;i++){
    var it = saved[i];
    if (it.type === 'quote') addQuoteToBoard(it.text, it.author, it.book, it.tags || []);
    else if (it.type === 'write') addWriteToBoard(it.text, it.tags || []);
    else if (it.type === 'visual' && it.image) addVisualToBoard(it.image, it.alt || '', it.tags || []);
  }
  // reset tag chips to neutral
  var chips = document.querySelectorAll('#tagFilterBar .tag-chip');
  for (var j=0;j<chips.length;j++) chips[j].classList.remove('active');
  filterByTag(null);

  renderTagFilterBar();
  updateEmptyBoardMessage();
});

// ================== TAGS (storage + render + picker + filter) ==================
var TAGS_KEY = 'boardTags';

function loadTags() {
  try { return JSON.parse(localStorage.getItem(TAGS_KEY) || '[]'); } catch (_) { return []; }
}
function saveTags(tags) {
  try { localStorage.setItem(TAGS_KEY, JSON.stringify(tags)); } catch (_) {}
}
function randomPastel() {
  var h = Math.floor(Math.random() * 360);
  return 'hsl(' + h + ' 80% 90%)';
}

function getCardTags(card) {
  try { return JSON.parse(card.dataset.tags || '[]'); } catch (_) { return []; }
}
function setCardTags(card, ids) {
  card.dataset.tags = JSON.stringify(Array.isArray(ids) ? ids : []);
}
function renderCardTags(card) {
  var strip = card.querySelector('.tag-strip');
  if (!strip) {
    strip = document.createElement('div');
    strip.className = 'tag-strip';
    card.appendChild(strip);
  }
  strip.innerHTML = '';
  var all = loadTags();
  var chosen = {};
  var t = getCardTags(card);
  for (var i=0;i<t.length;i++) chosen[t[i]] = true;
  for (var k=0;k<all.length;k++){
    var tag = all[k];
    if (chosen[tag.id]) {
      var chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.style.background = tag.color;
      chip.textContent = tag.name;
      strip.appendChild(chip);
    }
  }
}

function removeTagFromAllCards(tagId) {
  var cards = document.querySelectorAll('#boardGrid .board-card');
  for (var i=0;i<cards.length;i++){
    var card = cards[i];
    var tags = getCardTags(card).filter(function(id){ return id !== tagId; });
    setCardTags(card, tags);
    renderCardTags(card);
  }
}

function renderTagList() {
  var tags = loadTags();
  if (tagList) tagList.innerHTML = '';
  for (var i=0;i<tags.length;i++){
    (function(t){
      var li = document.createElement('li');
      li.style.background = t.color;
      li.innerHTML = '<span>'+t.name+'</span><button class="delete-tag" title="Delete tag" aria-label="Delete tag">&times;</button>';
      var del = li.querySelector('.delete-tag');
      del.addEventListener('click', function(){
        var updated = loadTags().filter(function(x){ return x.id !== t.id; });
        saveTags(updated);
        removeTagFromAllCards(t.id);
        renderTagList();
        renderTagFilterBar();
        saveBoardToStorage();
      });
      if (tagList) tagList.appendChild(li);
    })(tags[i]);
  }
  var atLimit = tags.length >= 5;
  if (newTagName) newTagName.disabled = atLimit;
  if (tagLimitMsg) tagLimitMsg.classList.toggle('hidden', !atLimit);
}
renderTagList();

if (tagCreateForm) {
  tagCreateForm.addEventListener('submit', function(e){
    e.preventDefault();
    var name = (newTagName && newTagName.value ? newTagName.value.trim() : '');
    if (!name) return;
    var tags = loadTags();
    if (tags.length >= 5) return;
    for (var i=0;i<tags.length;i++){
      if (tags[i].name.toLowerCase() === name.toLowerCase()) {
        if (newTagName) newTagName.value = '';
        return;
      }
    }
    var id = (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random()));
    tags.push({ id:id, name:name, color: randomPastel() });
    saveTags(tags);
    if (newTagName) newTagName.value = '';
    renderTagList();
    renderTagFilterBar();
  });
}

function openTagPicker(card, anchorBtn) {
  closeAnyTagPicker();

  var picker = document.createElement('div');
  picker.className = 'tag-picker';
  picker.innerHTML =
    '<h4>Choose tags</h4>' +
    '<div class="picker-list"></div>' +
    '<div class="picker-actions"><button type="button" class="picker-close">Close</button></div>';

  var list = picker.querySelector('.picker-list');
  var tags = loadTags();
  var selected = {};
  var arr = getCardTags(card);
  for (var i=0;i<arr.length;i++) selected[arr[i]] = true;

  if (tags.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No tags yet. Create some in the sidebar.';
    list.appendChild(empty);
  } else {
    for (var k=0;k<tags.length;k++){
      var t = tags[k];
      var row = document.createElement('label');
      row.className = 'picker-item';
      row.innerHTML =
        '<input type="checkbox" value="'+t.id+'" '+(selected[t.id] ? 'checked' : '')+'/>' +
        '<span class="tag-chip" style="background:'+t.color+'">'+t.name+'</span>';
      list.appendChild(row);
    }
  }

  picker.querySelector('.picker-close').addEventListener('click', closeAnyTagPicker);

  setTimeout(function(){
    document.addEventListener('click', outsideClose, { capture:true });
  }, 0);

  function outsideClose(e) {
    if (!picker.contains(e.target) && e.target !== anchorBtn) closeAnyTagPicker();
  }
  function closeAnyTagPicker() {
    var open = document.querySelectorAll('.tag-picker');
    for (var i=0;i<open.length;i++) open[i].remove();
    document.removeEventListener('click', outsideClose, { capture:true });
  }

  list.addEventListener('change', function(){
    var checkedEls = list.querySelectorAll('input[type="checkbox"]:checked');
    var ids = [];
    for (var i=0;i<checkedEls.length;i++) ids.push(checkedEls[i].value);
    setCardTags(card, ids);
    renderCardTags(card);
    saveBoardToStorage();
    applyFilters();
  });

  card.appendChild(picker);
}

function renderTagFilterBar() {
  if (!tagFilterBar) return;
  tagFilterBar.innerHTML = '';

  var allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = 'tag-chip-btn' + (activeTagFilter === null ? ' active' : '');
  allBtn.textContent = 'All';
  allBtn.addEventListener('click', function(){
    activeTagFilter = null;
    renderTagFilterBar();
    applyFilters();
  });
  tagFilterBar.appendChild(allBtn);

  var tags = loadTags();
  for (var i=0;i<tags.length;i++){
    (function(t){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tag-chip-btn' + (activeTagFilter === t.id ? ' active' : '');
      btn.textContent = t.name;
      if (activeTagFilter === t.id) btn.style.background = t.color;
      btn.addEventListener('click', function(){
        activeTagFilter = (activeTagFilter === t.id) ? null : t.id;
        renderTagFilterBar();
        applyFilters();
      });
      tagFilterBar.appendChild(btn);
    })(tags[i]);
  }
}

function filterByTag(tagId) {
  var cards = document.querySelectorAll('#boardGrid .board-card');
  for (var i=0;i<cards.length;i++){
    var tags = getCardTags(cards[i]);
    var matches = !tagId || tags.indexOf(tagId) !== -1;
    cards[i].classList.toggle('hidden-by-tag', !matches);
  }
}

// ================== SIMPLE DnD ==================
function wireCardDnD(card) {
  // make draggable (already set) + id present
  card.addEventListener('dragstart', function(e){
    e.dataTransfer.setData('text/plain', card.dataset.id || '');
    // small visual cue
    card.classList.add('drag-origin');
  });
  card.addEventListener('dragend', function(){
    card.classList.remove('drag-origin');
  });
}
// allow dropping on the grid
if (boardGrid) {
  boardGrid.addEventListener('dragover', function(e){ e.preventDefault(); });
  boardGrid.addEventListener('drop', function(e){
    e.preventDefault();
    var id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    var dragging = document.querySelector('.board-card[data-id="'+id+'"]');
    if (!dragging) return;

    // find element under pointer to decide insertBefore/append
    var after = document.elementFromPoint(e.clientX, e.clientY);
    var target = after ? after.closest('.board-card') : null;

    if (!target || target === dragging) {
      boardGrid.appendChild(dragging);
    } else {
      // place before or after depending on vertical center
      var r = target.getBoundingClientRect();
      var before = (e.clientY < r.top + r.height/2);
      if (before) boardGrid.insertBefore(dragging, target);
      else boardGrid.insertBefore(dragging, target.nextSibling);
    }
    saveBoardToStorage();
    refreshSeqFromDom();
  });
}

function refreshSeqFromDom() {
  if (!boardGrid) return;
  var children = boardGrid.children;
  for (var i=0;i<children.length;i++){
    children[i].dataset.seq = String(i + 1);
  }
}

// ================== PLUS MENU RETURN ==================
function showPlusMenuHome() {
  if (sidebar && sidebar.classList.contains('hidden')) {
    isBookOpen = true;
    sidebar.classList.add('open');
    if (bookIcon) bookIcon.src = 'images/open-book-icon.jpg';
  }
  if (plusMenu) plusMenu.classList.remove('hidden');
  if (plusOptions) plusOptions.classList.remove('hidden');
  if (quoteForm) quoteForm.classList.add('hidden');
  if (searchBox) searchBox.classList.add('hidden');

  if (customizeButton) customizeButton.classList.add('hidden');
  if (searchButton) searchButton.classList.add('hidden');
  if (plusButton) plusButton.classList.remove('hidden');
}

// ================== UTILS ==================
function updateEmptyBoardMessage() {
  if (!boardGrid || !emptyBoardMsg) return;
  var hasCards = !!boardGrid.querySelector('.board-card');
  emptyBoardMsg.classList.toggle('hidden', hasCards);
}

// ---- Scroll reveal (cards) ----
var revealObserver = new IntersectionObserver(function(entries, obs){
  for (var i=0;i<entries.length;i++){
    var entry = entries[i];
    if (entry.isIntersecting) {
      var el = entry.target;
      // tiny stagger based on current count
      if (!el.dataset.revealDelaySet) {
        var existing = Number(document.body.dataset.revealCount || 0);
        el.style.transitionDelay = Math.min(existing * 60, 240) + 'ms';
        document.body.dataset.revealCount = existing + 1;
        el.dataset.revealDelaySet = '1';
      }
      el.classList.add('in');
      obs.unobserve(el); // one-time
    }
  }
}, { threshold: 0.1 });

function registerForReveal(el){
  if (!el.classList.contains('reveal')) el.classList.add('reveal');
  revealObserver.observe(el);
}

// Register any cards already on the page
document.addEventListener('DOMContentLoaded', function(){
  var existing = document.querySelectorAll('#boardGrid .board-card');
  for (var i=0;i<existing.length;i++){
    registerForReveal(existing[i]);
  }
});

// ---- Scroll prompt fade ----
var hero = document.querySelector('.hero');
var scrollPrompt = document.querySelector('.hero .scroll-prompt');

function updateScrollPrompt() {
  if (!scrollPrompt) return;
  var scrolled = window.scrollY || document.documentElement.scrollTop;
  scrollPrompt.classList.toggle('hide', scrolled > 20);
}
window.addEventListener('scroll', updateScrollPrompt, { passive:true });
document.addEventListener('DOMContentLoaded', updateScrollPrompt);

// also hide when hero is mostly out of view
if (hero && scrollPrompt) {
  var spObserver = new IntersectionObserver(function(entries){
    var entry = entries[0];
    scrollPrompt.classList.toggle('hide', entry.intersectionRatio < 0.8);
  }, { threshold: [0, 0.8, 1] });
  spObserver.observe(hero);
}

