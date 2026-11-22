--[[
  Fan of Insight deck importer for Tabletop Simulator (Grand Archive TCG).

  Use: paste this into the Global script of a table, set CARD_BACK_URL, then type
    !import <fanofin.site deck URL or 32-character deck slug>
  in chat. The script spawns one deck each for Main, Material and Sideboard
  near your pointer.

  Data source: GET /v1/tts/decks/{slug} (account-bff/api/tts-deck.ts). The route
  returns card names, quantities and catalog image URLs. Only public or unlisted
  decks can be imported.

  Each card is its own one-card sheet (NumWidth = NumHeight = 1). This avoids
  building sprite sheets. TTS downloads one image per unique card.
]]

-- ===== Settings =====
local API_BASE = "https://accounts.fanofin.site/v1/tts/decks/"
-- Set this to the URL of your card back image. The importer refuses to run while it is empty.
local CARD_BACK_URL = ""
-- Where each section lands, relative to the spawn origin (x, z in table units).
local SECTION_LAYOUT = {
  { key = "main",      label = "Main",      dx = 0,  dz = 0 },
  { key = "material",  label = "Material",  dx = 4,  dz = 0 },
  { key = "sideboard", label = "Sideboard", dx = 8,  dz = 0 },
}
local SPAWN_HEIGHT = 2
local DEFAULT_ORIGIN = { x = 0, z = 0 }

-- ===== Helpers =====
local function say(player, text)
  if player and player.broadcast then
    player.broadcast(text, { 1, 1, 1 })
  else
    broadcastToAll(text, { 1, 1, 1 })
  end
end

--- Accepts a full URL or a bare slug. Returns nil when no 32-character hex slug is found.
function extractSlug(text)
  if not text then return nil end
  return string.match(string.lower(text), "(%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x)")
end

--- Builds the JSON table for one deck section.
--- `lines` is a list of { name, quantity, imageUrl }. Lines without an image are skipped
--- and their names are returned in `missing`.
function buildSectionObject(label, title, lines, position)
  local customDeck = {}
  local sheetByImage = {}
  local sheetCount = 0
  local cards = {}
  local deckIds = {}
  local missing = {}

  for _, line in ipairs(lines) do
    local image = line.imageUrl
    if type(image) ~= "string" or image == "" then
      table.insert(missing, line.name)
    else
      local sheet = sheetByImage[image]
      if not sheet then
        sheetCount = sheetCount + 1
        sheet = sheetCount
        sheetByImage[image] = sheet
        customDeck[tostring(sheet)] = {
          FaceURL = image,
          BackURL = CARD_BACK_URL,
          NumWidth = 1,
          NumHeight = 1,
          BackIsHidden = true,
          UniqueBack = false,
          Type = 0,
        }
      end
      for _ = 1, line.quantity do
        local cardId = sheet * 100
        table.insert(deckIds, cardId)
        table.insert(cards, {
          Name = "Card",
          Nickname = line.name,
          CardID = cardId,
          CustomDeck = { [tostring(sheet)] = customDeck[tostring(sheet)] },
          Transform = { posX = 0, posY = 0, posZ = 0, rotX = 0, rotY = 180, rotZ = 180, scaleX = 1, scaleY = 1, scaleZ = 1 },
        })
      end
    end
  end

  if #cards == 0 then return nil, missing end

  local transform = {
    posX = position.x, posY = position.y, posZ = position.z,
    rotX = 0, rotY = 180, rotZ = 180, scaleX = 1, scaleY = 1, scaleZ = 1,
  }
  local nickname = title .. " - " .. label

  if #cards == 1 then
    local single = cards[1]
    single.Transform = transform
    return single, missing
  end

  return {
    Name = "Deck",
    Nickname = nickname,
    Transform = transform,
    DeckIDs = deckIds,
    CustomDeck = customDeck,
    ContainedObjects = cards,
  }, missing
end

local function spawnOrigin(player)
  local origin = { x = DEFAULT_ORIGIN.x, z = DEFAULT_ORIGIN.z }
  if player and player.getPointerPosition then
    local pointer = player.getPointerPosition()
    if pointer then origin = { x = pointer.x, z = pointer.z } end
  end
  return origin
end

local function spawnDeck(deck, player)
  local origin = spawnOrigin(player)
  local spawned, skipped = 0, {}
  for _, section in ipairs(SECTION_LAYOUT) do
    local position = { x = origin.x + section.dx, y = SPAWN_HEIGHT, z = origin.z + section.dz }
    local object, missing = buildSectionObject(section.label, deck.title or "Deck", deck[section.key] or {}, position)
    for _, name in ipairs(missing) do table.insert(skipped, name) end
    if object then
      spawnObjectJSON({ json = JSON.encode(object) })
      spawned = spawned + 1
    end
  end
  say(player, "Imported \"" .. tostring(deck.title) .. "\" by " .. tostring(deck.author) .. ": " .. spawned .. " deck(s).")
  if #skipped > 0 then
    say(player, "No image for: " .. table.concat(skipped, ", "))
  end
end

-- ===== Entry points =====
function importDeck(input, player)
  if CARD_BACK_URL == "" then
    say(player, "Set CARD_BACK_URL in the Global script before importing.")
    return
  end
  local slug = extractSlug(input)
  if not slug then
    say(player, "Usage: !import <fanofin.site deck URL or 32-character deck slug>")
    return
  end
  say(player, "Importing deck...")
  WebRequest.get(API_BASE .. slug, function(request)
    if request.is_error or request.response_code ~= 200 then
      if request.response_code == 404 then
        say(player, "Deck not found. Only public or unlisted decks can be imported.")
      else
        say(player, "Import failed (" .. tostring(request.response_code) .. "). Try again.")
      end
      return
    end
    local ok, body = pcall(JSON.decode, request.text)
    if not ok or type(body) ~= "table" or type(body.deck) ~= "table" then
      say(player, "Import failed: the server sent an unexpected answer.")
      return
    end
    spawnDeck(body.deck, player)
  end)
end

function onChat(message, player)
  local argument = string.match(message, "^!import%s+(.+)$")
  if argument then
    importDeck(argument, player)
    return false -- hide the command from chat
  end
end
