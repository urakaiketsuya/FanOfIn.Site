--[[
  Fan of Insight table module for Tabletop Simulator (Grand Archive TCG).

  Builds player seats from script: playmats, scripting zones, a UI panel, and quick actions.
  It needs FanOfInImporter.lua (defines FOI and foiSay). tts/build.py joins both into one Global script.

  ASSUMPTIONS TO CHECK (nothing here has run in TTS yet):
    * Seat rotation: rot = 0 or 180 is the card rotY that reads upright for that seat. If cards
      face the wrong way, swap the rot values in SEATS.
    * Playmat size: Custom_Tile base size is assumed to be about 2.2 units. Adjust PLAYMAT.
    * "Recollect" moves every card from your memory zone to your hand. Change RECOLLECT below if
      the real rule differs.
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
local RECOLLECT = { from = "memory", to = "hand" }

-- Status token art: set an image URL to get a real token. Empty uses a plain marker.
local STATUS_TOKENS = {
  { name = "Imbued", image = "" },
  { name = "Fracturized", image = "" },
  { name = "Distant", image = "" },
  { name = "Snow Fairied", image = "" },
}

-- ===== State =====
local zones = {}        -- zones[color][key] = guid
local mats = {}         -- list of playmat guids
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

function foiBuildTable()
  clearTable()
  for _, seat in ipairs(seatsForMode()) do
    spawnMat(seat)
    spawnZones(seat)
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

--- Lays the cards in your memory zone out in a neat row.
function foiReorganizeMemory(color, player)
  local seat, layout = seatFor(color), ZONE_LAYOUT.memory
  if not seat then return end
  local cards = zoneContents(color, "memory")
  local step = math.min(2.2, layout.sx / math.max(#cards, 1))
  local start = layout.lx - step * (#cards - 1) / 2
  for index, obj in ipairs(cards) do
    local point = toWorld(seat, start + (index - 1) * step, layout.lz)
    obj.setPositionSmooth({ point.x, 2, point.z })
  end
  foiSay(player, "Memory arranged (" .. #cards .. ").")
end

-- Glimpse: looks at the top cards, visible only to you.
local function findMainDeck(color)
  for _, obj in ipairs(zoneContents(color, "deck")) do
    if obj.type == "Deck" then return obj end
  end
end

function foiGlimpse(color, count, player)
  local seat, deck = seatFor(color), findMainDeck(color)
  if not seat or not deck then foiSay(player, "No main deck found in your deck zone."); return end
  if glimpsed[color] and #glimpsed[color] > 0 then foiSay(player, "Return your glimpsed cards first."); return end
  glimpsed[color] = {}
  local hidden = otherColors(color)
  local function takeNext(index)
    if index > count or not deck or deck.isDestroyed() then return end
    local point = toWorld(seat, GLIMPSE_LOCAL.lx + (index - 1) * 2.4, GLIMPSE_LOCAL.lz)
    deck.takeObject({
      position = { point.x, 2, point.z },
      rotation = { 0, seat.rot, 0 },
      callback_function = function(card)
        card.setInvisibleTo(hidden)
        table.insert(glimpsed[color], card)
        Wait.time(function() takeNext(index + 1) end, 0.15)
      end,
    })
  end
  takeNext(1)
end

--- Puts glimpsed cards back on top in their original order.
function foiGlimpseReturn(color, player)
  local cards = glimpsed[color]
  if not cards or #cards == 0 then foiSay(player, "No glimpsed cards."); return end
  local seat = seatFor(color)
  local function putBack(index)
    if index < 1 then glimpsed[color] = {}; return end
    local deck = findMainDeck(color)
    local card = cards[index]
    if not deck or not card or card.isDestroyed() then
      foiSay(player, "The deck changed. Put the remaining glimpsed cards back by hand.")
      glimpsed[color] = {}
      return
    end
    card.setInvisibleTo({})
    card.setRotation({ 0, seat.rot, 180 })
    deck.putObject(card)
    Wait.time(function() putBack(index - 1) end, 0.2)
  end
  putBack(#cards)
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
function foiSpawnToken(name, color, player)
  local point = foiSeatPoint(color, "field")
  if not point then foiSay(player, "You are not seated in this layout."); return end
  local art
  for _, token in ipairs(STATUS_TOKENS) do if token.name == name then art = token.image end end
  if art and art ~= "" then
    spawnObjectJSON({ json = JSON.encode({
      Name = "Custom_Token",
      Nickname = name,
      Transform = { posX = point.x, posY = 3, posZ = point.z, rotX = 0, rotY = 0, rotZ = 0, scaleX = 0.6, scaleY = 1, scaleZ = 0.6 },
      CustomImage = { ImageURL = art, ImageSecondaryURL = "", ImageScalar = 1, WidthScale = 0, CustomToken = { Thickness = 0.2, MergeDistancePixels = 15, StandUp = false, Stackable = false } },
    }) })
  else
    local marker = spawnObject({ type = "Checker_white", position = { point.x, 3, point.z } })
    if marker then marker.setName(name) end
  end
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
    button("2P layout", "uiMode2"), button("4P layout", "uiMode4"),
    button("Wake up", "uiWakeUp"), button("Recollect", "uiRecollect"),
    button("Banish (hover or select)", "uiBanish"), button("Arrange memory", "uiArrange"),
    '<InputField id="foiGlimpseN" placeholder="Glimpse count (default 3)" onEndEdit="uiSetGlimpse"/>',
    button("Glimpse", "uiGlimpse"), button("Return glimpse", "uiGlimpseReturn"),
    button("GG Go Next", "uiGG"),
  }
  for _, token in ipairs(STATUS_TOKENS) do
    table.insert(rows, button("Token: " .. token.name, "uiToken_" .. string.gsub(token.name, "%s", "")))
  end
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
function uiSetGlimpse(player, value) inputFor(player).glimpse = tonumber(value) end

function uiImport(player) importDeck(inputFor(player).deck or "", player) end
function uiMode2(player) foiSetMode(2, player) end
function uiMode4(player) foiSetMode(4, player) end
function uiWakeUp(player) foiWakeUp(player.color, player) end
function uiRecollect(player) foiRecollect(player.color, player) end
function uiBanish(player) foiBanish(player.color, player) end
function uiArrange(player) foiReorganizeMemory(player.color, player) end
function uiGlimpse(player) foiGlimpse(player.color, math.max(1, math.floor(inputFor(player).glimpse or 3)), player) end
function uiGlimpseReturn(player) foiGlimpseReturn(player.color, player) end
function uiGG(player) foiGGGoNext(player.color, player) end

for _, token in ipairs(STATUS_TOKENS) do
  local name = token.name
  _G["uiToken_" .. string.gsub(name, "%s", "")] = function(player) foiSpawnToken(name, player.color, player) end
end

-- ===== Chat commands that belong to the table =====
function foiTableChat(message, player)
  if message == "!2p" then foiSetMode(2, player); return false end
  if message == "!4p" then foiSetMode(4, player); return false end
  local count = string.match(message, "^!glimpse%s*(%d*)$")
  if count then foiGlimpse(player.color, tonumber(count) or 3, player); return false end
  if message == "!unglimpse" then foiGlimpseReturn(player.color, player); return false end
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
end
