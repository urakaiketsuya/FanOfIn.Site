--[[
  Fan of Insight deck importer for Tabletop Simulator (Grand Archive TCG).

  Chat commands:
    !import <deck URL or 32-character slug>   import a Fan of Insight deck
    !dfc <front image URL> <back image URL>   spawn one double-faced card
    !sleeve <image URL>                       set your card back (applies to the next import)

  Data source: GET /v1/tts/decks/{slug} (account-bff/api/tts-deck.ts). The route returns card
  names, quantities, catalog image URLs and, for flip cards, the back-face image URL.

  Each card is its own one-card sheet (NumWidth = NumHeight = 1), so no sprite sheets are needed.
  Flip cards carry their back face as state 2. Right-click the card and pick the state to flip it.

  This file defines globals. The build script (tts/build.py) joins it with the table module.
]]

-- ===== Settings =====
local API_BASE = "https://accounts.fanofin.site/v1/tts/decks/"

-- Shared state. The table module reads and saves it.
FOI = FOI or { sleeves = {}, defaultSleeve = "", playmat = "", mode = 2 }
-- Modules append UI rows (XML strings) here. The table module builds the panel from them.
FOI_UI_ROWS = FOI_UI_ROWS or {}

local FALLBACK_ORIGIN = { x = 0, z = 0 }
local FALLBACK_SECTIONS = {
  main = { dx = 0, dz = 0 }, material = { dx = 4, dz = 0 }, sideboard = { dx = 8, dz = 0 },
}
local SECTIONS = {
  { key = "main", label = "Main" },
  { key = "material", label = "Material" },
  { key = "sideboard", label = "Sideboard" },
}
local SPAWN_HEIGHT = 2

-- ===== Helpers =====
function foiSay(player, text)
  if player and player.broadcast then player.broadcast(text, { 1, 1, 1 }) else broadcastToAll(text, { 1, 1, 1 }) end
end

function foiSleeveFor(color)
  local sleeve = FOI.sleeves[color]
  if sleeve and sleeve ~= "" then return sleeve end
  return FOI.defaultSleeve
end

--- Accepts a full URL or a bare slug. Returns nil when no 32-character hex slug is found.
function extractSlug(text)
  if not text then return nil end
  return string.match(string.lower(text), "(%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x)")
end

local function sheetEntry(face, back)
  return { FaceURL = face, BackURL = back, NumWidth = 1, NumHeight = 1, BackIsHidden = true, UniqueBack = false, Type = 0 }
end

local function cardTransform(rotY, faceUp)
  return { posX = 0, posY = 0, posZ = 0, rotX = 0, rotY = rotY, rotZ = faceUp and 0 or 180, scaleX = 1, scaleY = 1, scaleZ = 1 }
end

--- Builds the JSON table for one deck section.
--- `lines` is a list of { name, quantity, imageUrl, backImageUrl }. Lines without an image are
--- skipped and their names are returned in `missing`.
--- `opts` = { sleeve, rotY, home, position, faceUp }.
function buildSectionObject(label, title, lines, opts)
  local sleeve, rotY, home, position = opts.sleeve, opts.rotY or 180, opts.home or "", opts.position
  local customDeck, sheetByKey, sheetCount = {}, {}, 0
  local cards, deckIds, missing = {}, {}, {}

  local function sheetFor(face, back)
    local key = face .. "|" .. back
    if not sheetByKey[key] then
      sheetCount = sheetCount + 1
      sheetByKey[key] = sheetCount
      customDeck[tostring(sheetCount)] = sheetEntry(face, back)
    end
    return sheetByKey[key]
  end

  for _, line in ipairs(lines) do
    local image = line.imageUrl
    if type(image) ~= "string" or image == "" then
      table.insert(missing, line.name)
    else
      local sheet = sheetFor(image, sleeve)
      local backSheet
      local backImage = line.backImageUrl
      if type(backImage) == "string" and backImage ~= "" then backSheet = sheetFor(backImage, sleeve) end
      for _ = 1, line.quantity do
        local card = {
          Name = "Card",
          Nickname = line.name,
          GMNotes = "foi-home=" .. home,
          CardID = sheet * 100,
          CustomDeck = { [tostring(sheet)] = customDeck[tostring(sheet)] },
          Transform = cardTransform(rotY, opts.faceUp),
        }
        if backSheet then
          card.States = {
            ["2"] = {
              Name = "Card",
              Nickname = line.name .. " (back)",
              GMNotes = "foi-home=" .. home,
              CardID = backSheet * 100,
              CustomDeck = { [tostring(backSheet)] = customDeck[tostring(backSheet)] },
              Transform = cardTransform(rotY, opts.faceUp),
            },
          }
        end
        table.insert(deckIds, sheet * 100)
        table.insert(cards, card)
      end
    end
  end

  if #cards == 0 then return nil, missing end

  local transform = {
    posX = position.x, posY = position.y, posZ = position.z,
    rotX = 0, rotY = rotY, rotZ = opts.faceUp and 0 or 180, scaleX = 1, scaleY = 1, scaleZ = 1,
  }
  if #cards == 1 then
    cards[1].Transform = transform
    return cards[1], missing
  end
  return {
    Name = "Deck",
    Nickname = title .. " - " .. label,
    GMNotes = "foi-home=" .. home,
    Transform = transform,
    DeckIDs = deckIds,
    CustomDeck = customDeck,
    ContainedObjects = cards,
  }, missing
end

--- Where a section lands. Uses the seat layout when the table module set one up.
local function sectionPlacement(player, key)
  if foiSeatPoint and player and player.color then
    local point = foiSeatPoint(player.color, key)
    if point then return { x = point.x, y = SPAWN_HEIGHT, z = point.z }, point.rot end
  end
  local origin = FALLBACK_ORIGIN
  if player and player.getPointerPosition then
    local pointer = player.getPointerPosition()
    if pointer then origin = { x = pointer.x, z = pointer.z } end
  end
  local offset = FALLBACK_SECTIONS[key]
  return { x = origin.x + offset.dx, y = SPAWN_HEIGHT, z = origin.z + offset.dz }, 180
end

local function spawnDeck(deck, player)
  local color = player and player.color or ""
  local sleeve = foiSleeveFor(color)
  local spawned, skipped = 0, {}
  for _, section in ipairs(SECTIONS) do
    local position, rotY = sectionPlacement(player, section.key)
    local object, missing = buildSectionObject(section.label, deck.title or "Deck", deck[section.key] or {}, {
      sleeve = sleeve, rotY = rotY, home = section.key, position = position,
    })
    for _, name in ipairs(missing) do table.insert(skipped, name) end
    if object then
      spawnObjectJSON({ json = JSON.encode(object) })
      spawned = spawned + 1
    end
  end
  foiSay(player, "Imported \"" .. tostring(deck.title) .. "\" by " .. tostring(deck.author) .. ": " .. spawned .. " deck(s).")
  if #skipped > 0 then foiSay(player, "No image for: " .. table.concat(skipped, ", ")) end
end

-- ===== Entry points =====
function importDeck(input, player)
  if foiSleeveFor(player and player.color or "") == "" then
    foiSay(player, "Set a card back first: !sleeve <image URL>, or use the Sleeve field in the panel.")
    return
  end
  local slug = extractSlug(input)
  if not slug then
    foiSay(player, "Usage: !import <fanofin.site deck URL or 32-character deck slug>")
    return
  end
  foiSay(player, "Importing deck...")
  WebRequest.get(API_BASE .. slug, function(request)
    if request.is_error or request.response_code ~= 200 then
      if request.response_code == 404 then
        foiSay(player, "Deck not found. Only public or unlisted decks can be imported.")
      else
        foiSay(player, "Import failed (" .. tostring(request.response_code) .. "). Try again.")
      end
      return
    end
    local ok, body = pcall(JSON.decode, request.text)
    if not ok or type(body) ~= "table" or type(body.deck) ~= "table" then
      foiSay(player, "Import failed: the server sent an unexpected answer.")
      return
    end
    spawnDeck(body.deck, player)
  end)
end

--- One double-faced card from two image URLs.
function spawnDoubleFaced(frontUrl, backUrl, player)
  local sleeve = foiSleeveFor(player and player.color or "")
  if sleeve == "" then foiSay(player, "Set a card back first: !sleeve <image URL>."); return end
  local position, rotY = sectionPlacement(player, "main")
  local object = buildSectionObject("Double-faced", "Custom", {
    { name = "Double-faced card", quantity = 1, imageUrl = frontUrl, backImageUrl = backUrl },
  }, { sleeve = sleeve, rotY = rotY, home = "main", position = position })
  if object then spawnObjectJSON({ json = JSON.encode(object) }) end
end

local function isUrl(text) return type(text) == "string" and string.match(text, "^https?://") ~= nil end

function onChat(message, player)
  local importArg = string.match(message, "^!import%s+(.+)$")
  if importArg then importDeck(importArg, player); return false end

  local front, back = string.match(message, "^!dfc%s+(%S+)%s+(%S+)$")
  if front then
    if isUrl(front) and isUrl(back) then spawnDoubleFaced(front, back, player)
    else foiSay(player, "Usage: !dfc <front image URL> <back image URL>") end
    return false
  end

  local sleeve = string.match(message, "^!sleeve%s+(%S+)$")
  if sleeve then
    if isUrl(sleeve) then
      FOI.sleeves[player.color] = sleeve
      foiSay(player, "Card back set. It applies to your next import.")
    else
      foiSay(player, "Usage: !sleeve <image URL starting with http:// or https://>")
    end
    return false
  end

  if foiTableChat then return foiTableChat(message, player) end
end
