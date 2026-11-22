--[[
  Booster pack opener for the Fan of Insight TTS table.

  !pack <set prefix>   open one pack, for example: !pack HVN  (Abyssal Heaven)

  Card data comes from the Grand Archive card API (api.gatcg.com), filtered by set prefix.
  Pack structure follows the model in app/src/features/packs/packOdds.ts:
    7 commons, 3 uncommons, 1 rare-or-better, 1 foil slot (foil about 1 in 8 packs).
  Grand Archive does not publish an official pack table. This is an approximation, as that file says.
  Needs FanOfInImporter.lua (buildSectionObject, foiSay, foiSleeveFor) and FanOfInTable.lua.
]]

local CARD_API = "https://api.gatcg.com"
local PAGE_SIZE = 50
local MAX_PAGES = 20

-- Rates from packOdds.ts. A box is 24 packs.
local COMMON_SLOTS, UNCOMMON_SLOTS = 7, 3
local UR_RATE = 1 / 24
local CSR_RATE = 1 / (30 * 24)
local CUR_RATE = 1 / (15 * 24)
local FOIL_RATE = 1 / 8
-- Rarity IDs: 1 common, 2 uncommon, 3 rare, 4 super rare, 5 ultra rare, 7 collector SR, 8 collector UR.
-- 6 and 9 are promo-only prints and never appear in boosters.

local poolCache = {}  -- poolCache[prefix] = { [rarity] = { {name, image, back} } }

local function urlEncode(text)
  return (string.gsub(text, "([^%w%-_%.~])", function(c) return string.format("%%%02X", string.byte(c)) end))
end

local function safeImage(path)
  if type(path) == "string" and string.match(path, "^/cards/images/[%w_%-]+%.%a+$") then return path end
end

--- Builds rarity pools for one set prefix from a list of API cards.
function foiBuildPools(cards, prefix)
  local pools, seen = {}, {}
  for _, card in ipairs(cards) do
    for _, edition in ipairs(card.editions or {}) do
      local set = edition.set or {}
      local rarity = edition.rarity
      local image = safeImage(edition.image)
      if set.prefix == prefix and rarity ~= 6 and rarity ~= 9 and image and not seen[edition.uuid] then
        seen[edition.uuid] = true
        local back
        for _, face in ipairs(edition.other_orientations or {}) do
          back = back or safeImage(face.edition and face.edition.image)
        end
        pools[rarity] = pools[rarity] or {}
        table.insert(pools[rarity], { name = card.name, image = image, back = back })
      end
    end
  end
  return pools
end

local function pick(list)
  if not list or #list == 0 then return nil end
  return list[math.random(#list)]
end

local function poolSize(pools, rarity) return pools[rarity] and #pools[rarity] or 0 end

--- Rolls the rarity of the rare-or-better slot.
local function rollRareTier(pools)
  local roll = math.random()
  if roll < UR_RATE and poolSize(pools, 5) > 0 then return 5 end
  if roll < UR_RATE + CSR_RATE and poolSize(pools, 7) > 0 then return 7 end
  if roll < UR_RATE + CSR_RATE + CUR_RATE and poolSize(pools, 8) > 0 then return 8 end
  local rare, super = poolSize(pools, 3), poolSize(pools, 4)
  if rare + super == 0 then return 3 end
  return (math.random() * (rare + super) < rare) and 3 or 4
end

--- Falls back through more common rarities so a small set never leaves a slot empty.
local function draw(pools, target)
  for _, rarity in ipairs({ target, 2, 1, 3, 4, 5, 7, 8 }) do
    local card = pick(pools[rarity])
    if card then return card, rarity end
  end
end

--- One pack as a list of { name, image, back, foil }.
function foiRollPack(pools)
  local result = {}
  local function add(target, foil)
    local card = draw(pools, target)
    if card then table.insert(result, { name = card.name, image = card.image, back = card.back, foil = foil }) end
  end
  for _ = 1, COMMON_SLOTS do add(1, false) end
  for _ = 1, UNCOMMON_SLOTS do add(2, false) end
  add(rollRareTier(pools), false)
  local foil = math.random() < FOIL_RATE
  add(foil and rollRareTier(pools) or 1, foil)
  return result
end

--- Loads every page of cards for a set prefix, then calls done(pools) or done(nil, reason).
local function loadPools(prefix, done)
  if poolCache[prefix] then done(poolCache[prefix]); return end
  local cards = {}
  local function fetch(page)
    local url = CARD_API .. "/cards/search?prefix=" .. urlEncode(prefix) .. "&page_size=" .. PAGE_SIZE .. "&page=" .. page
    WebRequest.get(url, function(request)
      if request.is_error or request.response_code ~= 200 then done(nil, "card API error " .. tostring(request.response_code)); return end
      local ok, body = pcall(JSON.decode, request.text)
      if not ok or type(body) ~= "table" or type(body.data) ~= "table" then done(nil, "unexpected card API answer"); return end
      for _, card in ipairs(body.data) do table.insert(cards, card) end
      if body.has_more and page < MAX_PAGES then fetch(page + 1); return end
      local pools = foiBuildPools(cards, prefix)
      if next(pools) == nil then done(nil, "no cards found for prefix " .. prefix); return end
      poolCache[prefix] = pools
      done(pools)
    end)
  end
  fetch(1)
end

function foiOpenPack(prefix, player)
  local color = player and player.color or ""
  local sleeve = foiSleeveFor(color)
  if sleeve == "" then foiSay(player, "Set a card back first: !sleeve <image URL>."); return end
  if prefix == "" then foiSay(player, "Usage: !pack <set prefix>, for example !pack HVN"); return end
  foiSay(player, "Opening a " .. prefix .. " pack...")
  loadPools(prefix, function(pools, reason)
    if not pools then foiSay(player, "Could not open pack: " .. tostring(reason)); return end
    local pack = foiRollPack(pools)
    local lines, foilName = {}, nil
    for _, card in ipairs(pack) do
      table.insert(lines, { name = card.name, quantity = 1, imageUrl = CARD_API .. card.image, backImageUrl = card.back and (CARD_API .. card.back) or nil })
      if card.foil then foilName = card.name end
    end
    local point = foiSeatPoint(color, "field") or { x = 0, z = 0, rot = 180 }
    local object = buildSectionObject("Booster", prefix, lines, {
      sleeve = sleeve, rotY = point.rot, home = "pack", faceUp = true,
      position = { x = point.x, y = 3, z = point.z },
    })
    if object then spawnObjectJSON({ json = JSON.encode(object) }) end
    foiSay(player, prefix .. " pack opened: " .. #pack .. " cards." .. (foilName and (" Foil: " .. foilName .. ".") or ""))
  end)
end

local packPrefix = {}  -- packPrefix[color] = text typed in the panel
function uiSetPackPrefix(player, value) packPrefix[player.color] = value end
function uiOpenPack(player) foiOpenPack(packPrefix[player.color] or "", player) end

table.insert(FOI_UI_ROWS, '<InputField preferredHeight="28" id="foiPackPrefix" placeholder="Set prefix (e.g. HVN)" onEndEdit="uiSetPackPrefix"/>')
table.insert(FOI_UI_ROWS, '<Button preferredHeight="28" fontSize="13" onClick="uiOpenPack">Open booster pack</Button>')

--- Chat hook. Returns false when the message was handled, nil otherwise.
function foiPackChat(message, player)
  local prefix = string.match(message, "^!pack%s+(.+)$")
  if prefix then foiOpenPack(prefix, player); return false end
end
