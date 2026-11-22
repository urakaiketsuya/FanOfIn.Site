--[[
  Fan of Insight table module for Tabletop Simulator (Grand Archive TCG).

  Builds player seats from script: playmats, scripting zones, a UI panel, and quick actions.
  It needs FanOfInImporter.lua (defines FOI and foiSay). tts/build.py joins both into one Global script.

  ASSUMPTIONS TO CHECK (nothing here has run in TTS yet):
    * Seat rotation: rot = 0 or 180 is the card rotY that reads upright for that seat. If cards
      face the wrong way, swap the rot values in SEATS.
    * Playmat size: Custom_Tile base size is assumed to be about 2.2 units. Adjust PLAYMAT.
    * "Recollect" moves every card from your memory zone to your hand (rule confirmed by the owner).
    * Rested cards are rotated 90 degrees. "Wake up" turns cards in your field upright.
]]

-- ===== Layout =====
local SEATS_BY_MODE = {
  [2] = {
    { color = "Red",  x = 0,   z = -14, rot = 0 },
    { color = "Blue", x = 0,   z = 14,  rot = 180 },
  },
  [4] = {
    { color = "Red",    x = -14, z = -14, rot = 0 },
    { color = "Blue",   x = 14,  z = -14, rot = 0 },
    { color = "Green",  x = 14,  z = 14,  rot = 180 },
    { color = "Purple", x = -14, z = 14,  rot = 180 },
  },
}
-- Zone centres and sizes in seat-local units: lx to the right, lz toward the opponent.
local PLAYMAT = { width = 24, depth = 12, baseSize = 2.2 }
local ZONE_LAYOUT = {
  field     = { lx = -1,  lz = 1.5,  sx = 16, sz = 7 },
  memory    = { lx = 3,   lz = -4,   sx = 10, sz = 3 },
  graveyard = { lx = -10, lz = -3,   sx = 3,  sz = 4 },
  banish    = { lx = -10, lz = 2,    sx = 3,  sz = 4 },
  deck      = { lx = 10,  lz = -3,   sx = 3,  sz = 4 },
  material  = { lx = 10,  lz = 1.5,  sx = 3,  sz = 4 },
  sideboard = { lx = 10,  lz = 5.5,  sx = 3,  sz = 3 },
}
-- The importer asks for "main"; the deck zone holds it.
local ZONE_ALIAS = { main = "deck" }
local GLIMPSE_LOCAL = { lx = 0, lz = -8 }
-- Hand zone and damage counter sit on the player's side of the mat.
local HAND_LAYOUT = { lx = 0, lz = -12.5, sx = 20, sy = 8, sz = 5 }
local COUNTER_LAYOUT = { lx = 11, lz = -9.5 }
local SEAT_COLORS = {
  Red = { r = 0.856, g = 0.10, b = 0.094 }, Blue = { r = 0.118, g = 0.53, b = 1.0 },
  Green = { r = 0.192, g = 0.701, b = 0.168 }, Purple = { r = 0.627, g = 0.125, b = 0.941 },
}
local RECOLLECT = { from = "memory", to = "hand" }

-- Status markers: one colored marker per status, named on the object. No art is needed.
local STATUS_TOKENS = {
  { name = "Distant",     color = { r = 0.90, g = 0.70, b = 0.70 } },
  { name = "Imbued",      color = { r = 0.00, g = 0.70, b = 0.00 } },
  { name = "Fostered",    color = { r = 0.30, g = 0.30, b = 0.30 } },
  { name = "Fracturized", color = { r = 0.30, g = 0.75, b = 0.80 } },
  { name = "Suppressed",  color = { r = 0.20, g = 0.70, b = 0.20 } },
  { name = "Stealth",     color = { r = 0.70, g = 0.40, b = 0.10 } },
  { name = "Ephemeral",   color = { r = 0.80, g = 0.40, b = 0.90 } },
  { name = "Used Up",     color = { r = 0.50, g = 0.40, b = 0.90 } },
  { name = "Omen",        color = { r = 0.60, g = 0.60, b = 0.20 } },
  { name = "Frenzy",      color = { r = 0.20, g = 0.20, b = 0.80 } },
  { name = "Distortion",  color = { r = 0.80, g = 0.20, b = 0.40 } },
  { name = "Dontwake",    color = { r = 0.00, g = 0.80, b = 0.80 } },
  { name = "Immortality", color = { r = 0.70, g = 0.70, b = 0.70 } },
  { name = "True Sight",  color = { r = 0.40, g = 0.70, b = 0.90 } },
  { name = "Spellshroud", color = { r = 0.80, g = 0.60, b = 0.90 } },
  { name = "Brewed",      color = { r = 0.60, g = 0.70, b = 0.80 } },
  { name = "Woh",         color = { r = 0.60, g = 0.30, b = 0.50 } },
}

-- ===== State =====
local zones = {}        -- zones[color][key] = guid
local mats = {}         -- list of playmat, hand zone and counter guids
local glimpsed = {}     -- glimpsed[color] = list of card objects, top first

local function seatsForMode() return SEATS_BY_MODE[FOI.mode] or SEATS_BY_MODE[2] end

local function seatFor(color)
  for _, seat in ipairs(seatsForMode()) do if seat.color == color then return seat end end
end

local function toWorld(seat, lx, lz)
  local s = (seat.rot == 180) and -1 or 1
  return { x = seat.x + s * lx, z = seat.z + s * lz }
end

--- World position and card rotation for a zone key. Used by the importer.
function foiSeatPoint(color, key)
  local seat = seatFor(color)
  local layout = ZONE_LAYOUT[ZONE_ALIAS[key] or key]
  if not seat or not layout then return nil end
  local point = toWorld(seat, layout.lx, layout.lz)
  point.rot = seat.rot
  return point
end

local function zoneObject(color, key)
  local guid = zones[color] and zones[color][key]
  return guid and getObjectFromGUID(guid) or nil
end

local function zoneContents(color, key)
  local zone = zoneObject(color, key)
  if not zone then return {} end
  local found = {}
  for _, obj in ipairs(zone.getObjects()) do
    if obj.type == "Card" or obj.type == "Deck" then table.insert(found, obj) end
  end
  return found
end

local function otherColors(color)
  local result = {}
  for _, seat in ipairs(seatsForMode()) do if seat.color ~= color then table.insert(result, seat.color) end end
  return result
end

-- ===== Building the table =====
local function clearTable()
  for _, guid in ipairs(mats) do
    local obj = getObjectFromGUID(guid)
    if obj then obj.destruct() end
  end
  for _, byKey in pairs(zones) do
    for _, guid in pairs(byKey) do
      local obj = getObjectFromGUID(guid)
      if obj then obj.destruct() end
    end
  end
  zones, mats, glimpsed = {}, {}, {}
end

local function spawnMat(seat)
  if FOI.playmat == "" then return end
  local scale = PLAYMAT.width / PLAYMAT.baseSize
  local object = spawnObjectJSON({ json = JSON.encode({
    Name = "Custom_Tile",
    Nickname = seat.color .. " playmat",
    Locked = true,
    Transform = {
      posX = seat.x, posY = 0.96, posZ = seat.z, rotX = 0, rotY = seat.rot, rotZ = 0,
      scaleX = scale, scaleY = 1, scaleZ = PLAYMAT.depth / PLAYMAT.baseSize,
    },
    CustomImage = {
      ImageURL = FOI.playmat, ImageSecondaryURL = "", ImageScalar = 1, WidthScale = 0,
      CustomTile = { Type = 0, Thickness = 0.1, Stackable = false, Stretch = true },
    },
  }) })
  if object then table.insert(mats, object.getGUID()) end
end

local function spawnZones(seat)
  zones[seat.color] = {}
  for key, layout in pairs(ZONE_LAYOUT) do
    local point = toWorld(seat, layout.lx, layout.lz)
    local zone = spawnObject({
      type = "ScriptingTrigger",
      position = { point.x, 2, point.z },
      scale = { layout.sx, 4, layout.sz },
    })
    if zone then zones[seat.color][key] = zone.getGUID() end
  end
end

--- A hand zone owned by the seat color. Owner is set with FogColor, as in saved TTS tables.
local function spawnHand(seat)
  local point = toWorld(seat, HAND_LAYOUT.lx, HAND_LAYOUT.lz)
  local tint = SEAT_COLORS[seat.color] or { r = 1, g = 1, b = 1 }
  local object = spawnObjectJSON({ json = JSON.encode({
    Name = "HandTrigger",
    Nickname = "Hand (" .. seat.color .. ")",
    Locked = true,
    FogColor = seat.color,
    ColorDiffuse = { r = tint.r, g = tint.g, b = tint.b, a = 0 },
    Transform = {
      posX = point.x, posY = 4, posZ = point.z, rotX = 0, rotY = seat.rot, rotZ = 0,
      scaleX = HAND_LAYOUT.sx, scaleY = HAND_LAYOUT.sy, scaleZ = HAND_LAYOUT.sz,
    },
  }) })
  if object then table.insert(mats, object.getGUID()) end
end

--- One damage counter per seat, for the champion.
local function spawnCounter(seat)
  local point = toWorld(seat, COUNTER_LAYOUT.lx, COUNTER_LAYOUT.lz)
  local tint = SEAT_COLORS[seat.color] or { r = 1, g = 1, b = 1 }
  local object = spawnObjectJSON({ json = JSON.encode({
    Name = "Counter",
    Nickname = "Champion Damage (" .. seat.color .. ")",
    Locked = true,
    ColorDiffuse = { r = tint.r, g = tint.g, b = tint.b },
    Counter = { value = 0 },
    Transform = {
      posX = point.x, posY = 3, posZ = point.z, rotX = 0, rotY = seat.rot, rotZ = 0,
      scaleX = 2.5, scaleY = 1.2, scaleZ = 2.5,
    },
  }) })
  if object then table.insert(mats, object.getGUID()) end
end

function foiBuildTable()
  clearTable()
  for _, seat in ipairs(seatsForMode()) do
    spawnMat(seat)
    spawnZones(seat)
    spawnHand(seat)
    spawnCounter(seat)
  end
end

function foiSetMode(mode, player)
  if mode ~= 2 and mode ~= 4 then return end
  FOI.mode = mode
  foiBuildTable()
  foiSay(player, mode .. "-player layout built. Cards already on the table stay where they are.")
end

function foiSetPlaymat(url, player)
  FOI.playmat = url
  foiBuildTable()
  foiSay(player, "Playmat set.")
end

--- Switches to a custom rectangular table and paints it with the image.
--- setTable replaces the table object, so the image is set a few frames later.
function foiSetTable(url, player)
  Tables.setTable("Custom Rectangle")
  Wait.frames(function() Tables.setCustomURL(url) end, 5)
  FOI.tableUrl = url
  foiSay(player, "Table surface set.")
end

-- ===== Quick actions =====
function foiWakeUp(color, player)
  local seat = seatFor(color)
  if not seat then foiSay(player, "You are not seated in this layout."); return end
  local count = 0
  for _, obj in ipairs(zoneContents(color, "field")) do
    local rot = obj.getRotation()
    obj.setRotationSmooth({ rot.x, seat.rot, rot.z })
    count = count + 1
  end
  foiSay(player, "Woke up " .. count .. " card(s).")
end

function foiRecollect(color, player)
  local moved = 0
  for _, obj in ipairs(zoneContents(color, RECOLLECT.from)) do
    local count = (obj.type == "Deck") and #obj.getObjects() or 1
    if RECOLLECT.to == "hand" then obj.deal(count, color) end
    moved = moved + count
  end
  foiSay(player, "Recollected " .. moved .. " card(s).")
end

--- Moves the cards you hover over, or have selected, to your banish zone.
function foiBanish(color, player)
  local seat, target = seatFor(color), foiSeatPoint(color, "banish")
  if not seat or not target or not player then return end
  local list = player.getSelectedObjects()
  if #list == 0 then
    local hover = player.getHoverObject()
    if hover then list = { hover } end
  end
  local count = 0
  for _, obj in ipairs(list) do
    if obj.type == "Card" or obj.type == "Deck" then
      obj.setPositionSmooth({ target.x, 2 + count * 0.2, target.z })
      obj.setRotationSmooth({ 0, seat.rot, 0 })
      count = count + 1
    end
  end
  foiSay(player, count > 0 and ("Banished " .. count .. " card(s).") or "Hover over a card, or select cards, to banish.")
end

-- Memory slots for `total` cards, in seat-local order from left to right.
local function memorySlot(seat, index, total)
  local layout = ZONE_LAYOUT.memory
  local step = math.min(2.2, layout.sx / math.max(total, 1))
  local start = layout.lx - step * (total - 1) / 2
  return toWorld(seat, start + (index - 1) * step, layout.lz)
end

local function sortedMemoryCards(color, seat)
  local cards = zoneContents(color, "memory")
  table.sort(cards, function(a, b) return a.getPosition().x * (seat.rot == 180 and -1 or 1) < b.getPosition().x * (seat.rot == 180 and -1 or 1) end)
  return cards
end

--- Lays the cards in your memory zone out in a neat row.
function foiReorganizeMemory(color, player)
  local seat = seatFor(color)
  if not seat then return end
  local cards = sortedMemoryCards(color, seat)
  for index, obj in ipairs(cards) do
    local point = memorySlot(seat, index, #cards)
    obj.setPositionSmooth({ point.x, 2, point.z })
  end
  foiSay(player, "Memory arranged (" .. #cards .. ").")
end

--- Reserve: face-down cards in your hand move into memory, and memory is re-spaced to fit.
--- This matches the observed behaviour of the Fracturized Reserve button.
function foiReserve(color, player)
  local seat = seatFor(color)
  if not seat then foiSay(player, "You are not seated in this layout."); return end
  local incoming = {}
  for _, obj in ipairs(Player[color].getHandObjects()) do
    if obj.type == "Card" and math.abs(obj.getRotation().z) > 90 then table.insert(incoming, obj) end
  end
  local existing = sortedMemoryCards(color, seat)
  local total = #existing + #incoming
  for index, obj in ipairs(existing) do
    local point = memorySlot(seat, index, total)
    obj.setPositionSmooth({ point.x, 2, point.z })
  end
  for offset, obj in ipairs(incoming) do
    local point = memorySlot(seat, #existing + offset, total)
    obj.setRotation({ 0, seat.rot, 180 })
    obj.setPositionSmooth({ point.x, 2, point.z })
  end
  foiSay(player, #incoming > 0 and ("Reserved " .. #incoming .. " card(s).") or "Flip cards face-down in your hand first, then press Reserve.")
end

-- Glimpse: looks at cards from the top or bottom of your deck, visible only to you.
local function findMainDeck(color)
  for _, obj in ipairs(zoneContents(color, "deck")) do
    if obj.type == "Deck" then return obj end
  end
end

--- opts.fromBottom: take from the bottom. opts.thenBottom: send the cards to the bottom when done (quick bottom).
function foiGlimpse(color, count, player, opts)
  opts = opts or {}
  local seat, deck = seatFor(color), findMainDeck(color)
  if not seat or not deck then foiSay(player, "No main deck found in your deck zone."); return end
  if glimpsed[color] and #glimpsed[color] > 0 then foiSay(player, "Return your glimpsed cards first."); return end
  glimpsed[color] = {}
  local hidden = opts.thenBottom and {} or otherColors(color)
  local function takeNext(index)
    if index > count or deck.isDestroyed() then
      if opts.thenBottom then
        Wait.time(function() foiGlimpseReturn(color, player, true) end, 0.3)
      elseif index <= count then
        foiSay(player, "Deck ran out after " .. (index - 1) .. " card(s).")
      end
      return
    end
    local point = toWorld(seat, GLIMPSE_LOCAL.lx + (index - 1) * 2.4, GLIMPSE_LOCAL.lz)
    deck.takeObject({
      position = { point.x, 2, point.z },
      rotation = { 0, seat.rot, 0 },
      top = not opts.fromBottom,
      callback_function = function(card)
        card.setInvisibleTo(hidden)
        table.insert(glimpsed[color], card)
        Wait.time(function() takeNext(index + 1) end, 0.15)
      end,
    })
  end
  takeNext(1)
end

--- Quick bottom: moves the top cards to the bottom of the deck without a look.
function foiQuickBottom(color, count, player)
  foiGlimpse(color, count, player, { thenBottom = true })
end

--- Puts glimpsed cards back. Top: original order. Bottom: first card ends highest of the group.
--- The API puts a card at the end of the deck nearest to it in height, so cards are placed just
--- above or just below the deck before putObject.
function foiGlimpseReturn(color, player, toBottom)
  local cards = glimpsed[color]
  if not cards or #cards == 0 then foiSay(player, "No glimpsed cards."); return end
  local seat = seatFor(color)
  local first, last, step = #cards, 1, -1
  if toBottom then first, last, step = 1, #cards, 1 end
  local function putBack(index)
    if (step == -1 and index < last) or (step == 1 and index > last) then glimpsed[color] = {}; return end
    local deck = findMainDeck(color)
    local card = cards[index]
    if not deck or not card or card.isDestroyed() then
      foiSay(player, "The deck changed. Put the remaining glimpsed cards back by hand.")
      glimpsed[color] = {}
      return
    end
    local at = deck.getPosition()
    card.setInvisibleTo({})
    card.setRotation({ 0, seat.rot, 180 })
    card.setPosition({ at.x, at.y + (toBottom and -1 or 2), at.z })
    deck.putObject(card)
    Wait.time(function() putBack(index + step) end, 0.2)
  end
  putBack(first)
end

-- GG Go Next: sends every card home and shuffles the main deck.
local function homeOf(obj)
  return string.match(obj.getGMNotes() or "", "foi%-home=(%w+)") or "main"
end

function foiGGGoNext(color, player)
  local seat = seatFor(color)
  if not seat then foiSay(player, "You are not seated in this layout."); return end
  local stack = { main = 0, material = 0, sideboard = 0 }
  local pending = 0

  local function sendHome(card)
    local key = homeOf(card)
    if stack[key] == nil then key = "main" end
    local point = foiSeatPoint(color, key)
    stack[key] = stack[key] + 1
    card.setRotationSmooth({ 0, seat.rot, 180 })
    card.setPositionSmooth({ point.x, 3 + stack[key] * 0.15, point.z })
  end

  local function drain(deck)
    pending = pending + 1
    local function step()
      if deck.isDestroyed() or #deck.getObjects() == 0 then pending = pending - 1; return end
      deck.takeObject({
        position = { seat.x, 6, seat.z },
        callback_function = function(card) sendHome(card); Wait.time(step, 0.1) end,
      })
    end
    step()
  end

  local gathered = {}
  for _, key in ipairs({ "field", "memory", "graveyard", "banish" }) do
    for _, obj in ipairs(zoneContents(color, key)) do table.insert(gathered, obj) end
  end
  for _, obj in ipairs(Player[color].getHandObjects()) do table.insert(gathered, obj) end

  for _, obj in ipairs(gathered) do
    if obj.type == "Deck" then drain(obj) else sendHome(obj) end
  end

  -- Wait for the cards to arrive, then merge each pile and shuffle the main deck.
  local function finish()
    if pending > 0 then Wait.time(finish, 0.5); return end
    Wait.time(function()
      for _, key in ipairs({ "deck", "material", "sideboard" }) do
        local pile = zoneContents(color, key)
        if #pile > 1 then
          local result = group(pile)
          if key == "deck" and result and result[1] then result[1].shuffle() end
        elseif #pile == 1 and key == "deck" and pile[1].type == "Deck" then
          pile[1].shuffle()
        end
      end
      foiSay(player, "Ready for the next game.")
    end, 1.5)
  end
  Wait.time(finish, 1)
end

-- ===== Status tokens =====
local tokenCount = {}  -- tokenCount[color] = markers spawned, used to fan them out

local function findToken(name)
  local wanted = string.lower(name or "")
  for _, token in ipairs(STATUS_TOKENS) do
    if string.lower(token.name) == wanted then return token end
  end
end

function foiSpawnToken(name, color, player)
  local token = findToken(name)
  if not token then foiSay(player, "Unknown status: " .. tostring(name)); return end
  local point = foiSeatPoint(color, "field")
  if not point then foiSay(player, "You are not seated in this layout."); return end
  tokenCount[color] = (tokenCount[color] or 0) + 1
  local offset = ((tokenCount[color] - 1) % 8) * 0.8 - 2.8
  local marker = spawnObject({ type = "Checker_white", position = { point.x + offset, 3, point.z } })
  if marker then
    marker.setName(token.name)
    marker.setColorTint(token.color)
  end
end

-- ===== Dice markers =====
-- Right-click a die and pick a marker type. The die takes the marker's name and color.
local DICE_MARKERS = {
  { name = "Damage",      color = { r = 0.9, g = 0.0, b = 0.0 } },
  { name = "Prevention",  color = { r = 0.1, g = 0.3, b = 0.8 } },
  { name = "Buff",        color = { r = 0.0, g = 0.0, b = 0.0 } },
  { name = "Durability",  color = { r = 0.3, g = 0.3, b = 0.3 } },
  { name = "Level",       color = { r = 0.6, g = 0.1, b = 0.6 } },
  { name = "Preparation", color = { r = 0.2, g = 0.7, b = 0.2 } },
  { name = "Enlighten",   color = { r = 0.7, g = 0.4, b = 0.1 } },
  { name = "Quest",       color = { r = 0.8, g = 0.4, b = 0.9 } },
  { name = "Glimmer",     color = { r = 0.5, g = 0.4, b = 0.9 } },
  { name = "Age",         color = { r = 0.6, g = 0.6, b = 0.2 } },
  { name = "Lash",        color = { r = 0.2, g = 0.2, b = 0.8 } },
  { name = "Debuff",      color = { r = 0.8, g = 0.2, b = 0.4 } },
  { name = "Wither",      color = { r = 0.0, g = 0.8, b = 0.8 } },
  { name = "Aim",         color = { r = 0.7, g = 0.7, b = 0.7 } },
  { name = "Refinement",  color = { r = 0.4, g = 0.7, b = 0.9 } },
  { name = "Charge",      color = { r = 0.8, g = 0.6, b = 0.9 } },
  { name = "Tactic",      color = { r = 0.6, g = 0.7, b = 0.8 } },
  { name = "Music",       color = { r = 0.6, g = 0.3, b = 0.5 } },
}

function foiAttachDiceMenu(die)
  if not die or die.isDestroyed() or die.type ~= "Dice" then return end
  die.clearContextMenu()
  for _, marker in ipairs(DICE_MARKERS) do
    die.addContextMenuItem("Marker: " .. marker.name, function(_, _, target)
      target.setName(marker.name)
      target.setColorTint(marker.color)
    end)
  end
end

--- New dice get the menu. The short wait lets the object finish spawning.
function onObjectSpawn(object)
  if object.type == "Dice" then
    Wait.frames(function() foiAttachDiceMenu(object) end, 2)
  end
end

--- A six-sided die at the player's field.
function foiSpawnDie(color, player)
  local point = foiSeatPoint(color, "field")
  if not point then foiSay(player, "You are not seated in this layout."); return end
  spawnObject({ type = "Die_6", position = { point.x, 3, point.z + 2 } })
end

-- ===== UI =====
local function buildXml()
  local function button(label, handler)
    return '<Button onClick="' .. handler .. '" preferredHeight="28" fontSize="13">' .. label .. '</Button>'
  end
  local rows = {
    '<Text color="#FFFFFF" fontSize="15" fontStyle="Bold">Fan of Insight</Text>',
    '<InputField id="foiDeckUrl" placeholder="Deck URL" onEndEdit="uiSetDeckUrl"/>',
    button("Import deck", "uiImport"),
    '<InputField id="foiSleeveUrl" placeholder="Sleeve image URL" onEndEdit="uiSetSleeve"/>',
    '<InputField id="foiPlaymatUrl" placeholder="Playmat image URL" onEndEdit="uiSetPlaymat"/>',
    '<InputField id="foiTableUrl" placeholder="Table image URL" onEndEdit="uiSetTable"/>',
    button("2P layout", "uiMode2"), button("4P layout", "uiMode4"),
    button("Spawn die (right-click for marker)", "uiDie"),
    button("Wake up", "uiWakeUp"), button("Recollect", "uiRecollect"),
    button("Reserve (face-down hand cards)", "uiReserve"),
    button("Banish (hover or select)", "uiBanish"), button("Arrange memory", "uiArrange"),
    '<InputField id="foiGlimpseN" placeholder="Glimpse count (default 3)" onEndEdit="uiSetGlimpse"/>',
    button("Glimpse top", "uiGlimpse"), button("Glimpse bottom", "uiGlimpseBottom"),
    button("Return to top", "uiGlimpseReturn"), button("Return to bottom", "uiGlimpseReturnBottom"),
    button("Quick bottom (count above)", "uiQuickBottom"),
    button("GG Go Next", "uiGG"),
  }
  local options = {}
  for _, token in ipairs(STATUS_TOKENS) do table.insert(options, "<Option>" .. token.name .. "</Option>") end
  table.insert(rows, '<Dropdown id="foiToken" onValueChanged="uiSetToken">' .. table.concat(options) .. '</Dropdown>')
  table.insert(rows, button("Spawn status marker", "uiToken"))
  return '<Panel id="foiPanel" width="230" height="' .. (#rows * 34 + 10) .. '" '
    .. 'color="#1E1E28E6" rectAlignment="MiddleLeft" offsetXY="10 0" padding="8 8 8 8">'
    .. '<VerticalLayout spacing="4" childForceExpandHeight="false">' .. table.concat(rows) .. '</VerticalLayout></Panel>'
end

local inputs = {}  -- inputs[color] = { deck=, sleeve=, playmat=, glimpse= }
local function inputFor(player)
  inputs[player.color] = inputs[player.color] or {}
  return inputs[player.color]
end

function uiSetDeckUrl(player, value) inputFor(player).deck = value end
function uiSetSleeve(player, value)
  if string.match(value or "", "^https?://") then
    FOI.sleeves[player.color] = value
    foiSay(player, "Card back set. It applies to your next import.")
  end
end
function uiSetPlaymat(player, value)
  if string.match(value or "", "^https?://") then foiSetPlaymat(value, player) end
end
function uiSetTable(player, value)
  if string.match(value or "", "^https?://") then foiSetTable(value, player) end
end
function uiDie(player) foiSpawnDie(player.color, player) end
function uiSetGlimpse(player, value) inputFor(player).glimpse = tonumber(value) end

function uiImport(player) importDeck(inputFor(player).deck or "", player) end
function uiMode2(player) foiSetMode(2, player) end
function uiMode4(player) foiSetMode(4, player) end
function uiWakeUp(player) foiWakeUp(player.color, player) end
function uiRecollect(player) foiRecollect(player.color, player) end
function uiReserve(player) foiReserve(player.color, player) end
function uiBanish(player) foiBanish(player.color, player) end
function uiArrange(player) foiReorganizeMemory(player.color, player) end
function uiGlimpse(player) foiGlimpse(player.color, math.max(1, math.floor(inputFor(player).glimpse or 3)), player) end
local function glimpseCount(player) return math.max(1, math.floor(inputFor(player).glimpse or 3)) end
function uiGlimpseBottom(player) foiGlimpse(player.color, glimpseCount(player), player, { fromBottom = true }) end
function uiGlimpseReturn(player) foiGlimpseReturn(player.color, player, false) end
function uiGlimpseReturnBottom(player) foiGlimpseReturn(player.color, player, true) end
function uiQuickBottom(player) foiQuickBottom(player.color, glimpseCount(player), player) end
function uiGG(player) foiGGGoNext(player.color, player) end

function uiSetToken(player, value) inputFor(player).token = value end
function uiToken(player) foiSpawnToken(inputFor(player).token or STATUS_TOKENS[1].name, player.color, player) end

-- ===== Chat commands that belong to the table =====
function foiTableChat(message, player)
  if message == "!2p" then foiSetMode(2, player); return false end
  if message == "!4p" then foiSetMode(4, player); return false end
  local count = string.match(message, "^!glimpse%s*(%d*)$")
  if count then foiGlimpse(player.color, tonumber(count) or 3, player); return false end
  local bottomCount = string.match(message, "^!glimpsebottom%s*(%d*)$")
  if bottomCount then foiGlimpse(player.color, tonumber(bottomCount) or 3, player, { fromBottom = true }); return false end
  local quick = string.match(message, "^!bottom%s*(%d*)$")
  if quick then foiQuickBottom(player.color, tonumber(quick) or 1, player); return false end
  if message == "!unglimpse" then foiGlimpseReturn(player.color, player, false); return false end
  if message == "!unglimpse bottom" then foiGlimpseReturn(player.color, player, true); return false end
  local tableUrl = string.match(message, "^!table%s+(https?://%S+)$")
  if tableUrl then foiSetTable(tableUrl, player); return false end
  if message == "!die" then foiSpawnDie(player.color, player); return false end
  local status = string.match(message, "^!token%s+(.+)$")
  if status then foiSpawnToken(status, player.color, player); return false end
  if message == "!reserve" then foiReserve(player.color, player); return false end
  if message == "!wake" then foiWakeUp(player.color, player); return false end
  if message == "!gg" then foiGGGoNext(player.color, player); return false end
  local playmat = string.match(message, "^!playmat%s+(https?://%S+)$")
  if playmat then foiSetPlaymat(playmat, player); return false end
end

-- ===== Save and load =====
function onSave()
  return JSON.encode({ foi = FOI, zones = zones, mats = mats })
end

function onLoad(savedState)
  if savedState and savedState ~= "" then
    local ok, state = pcall(JSON.decode, savedState)
    if ok and type(state) == "table" then
      FOI = state.foi or FOI
      FOI.sleeves = FOI.sleeves or {}
      zones, mats = state.zones or {}, state.mats or {}
    end
  end
  if next(zones) == nil then foiBuildTable() end
  UI.setXml(buildXml())
  for _, object in ipairs(getObjects()) do foiAttachDiceMenu(object) end
end
