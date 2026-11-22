--[[
  Local replay log for the Fan of Insight TTS table.

  !record      start logging card movement between zones
  !stoprecord  stop logging
  !replay      write the log into a Notebook tab (everyone can read it)
  !clearreplay erase the log

  This is an in-game action log, not a hosted replay viewer. It records which card entered or left
  which zone. Cards that are face-down appear as "a card" so hidden information stays hidden.
  The log is kept in the save file (up to MAX_EVENTS entries).
  Needs FanOfInTable.lua (foiZoneInfo, foiSay).
]]

local MAX_EVENTS = 4000

FOI.replay = FOI.replay or { on = false, events = {} }

local function clock()
  local seconds = math.floor((Time and Time.time) or 0)
  return string.format("%02d:%02d", math.floor(seconds / 60), seconds % 60)
end

local function push(entry)
  local events = FOI.replay.events
  table.insert(events, entry)
  if #events > MAX_EVENTS then table.remove(events, 1) end
end

local function faceDown(object)
  return math.abs(object.getRotation().z) > 90
end

local function describe(object)
  if object.type == "Deck" then return "a pile of " .. #object.getObjects() .. " card(s)" end
  if faceDown(object) then return "a card" end
  local name = object.getName()
  return (name ~= "" and name) or "a card"
end

local function logZone(verb, zone, object)
  if not FOI.replay.on then return end
  if object.type ~= "Card" and object.type ~= "Deck" then return end
  local color, key = foiZoneInfo(zone.guid)
  if not color then return end
  push({ t = clock(), who = color, text = describe(object) .. " " .. verb .. " " .. key })
end

function onObjectEnterZone(zone, object) logZone("entered", zone, object) end
function onObjectLeaveZone(zone, object) logZone("left", zone, object) end

--- A labelled marker in the log, for example from GG Go Next.
function foiReplayMark(color, text)
  if FOI.replay.on then push({ t = clock(), who = color, text = text }) end
end

function foiReplayExport(player)
  local events = FOI.replay.events
  if #events == 0 then foiSay(player, "The replay log is empty. Use !record first."); return end
  local lines = {}
  for _, entry in ipairs(events) do table.insert(lines, entry.t .. "  " .. entry.who .. ": " .. entry.text) end
  Notes.addNotebookTab({ title = "Replay " .. clock(), body = table.concat(lines, "\n"), color = "Grey" })
  foiSay(player, "Replay written to the Notebook (" .. #events .. " events).")
end

function uiRecord(player)
  FOI.replay.on = true
  push({ t = clock(), who = player.color, text = "recording started" })
  foiSay(player, "Recording started.")
end
function uiStopRecord(player)
  push({ t = clock(), who = player.color, text = "recording stopped" })
  FOI.replay.on = false
  foiSay(player, "Recording stopped.")
end
function uiReplayExport(player) foiReplayExport(player) end

table.insert(FOI_UI_ROWS, '<Button preferredHeight="28" fontSize="13" onClick="uiRecord">Start recording</Button>')
table.insert(FOI_UI_ROWS, '<Button preferredHeight="28" fontSize="13" onClick="uiStopRecord">Stop recording</Button>')
table.insert(FOI_UI_ROWS, '<Button preferredHeight="28" fontSize="13" onClick="uiReplayExport">Write replay to notebook</Button>')

function foiReplayChat(message, player)
  if message == "!record" then uiRecord(player); return false end
  if message == "!stoprecord" then uiStopRecord(player); return false end
  if message == "!replay" then foiReplayExport(player); return false end
  if message == "!clearreplay" then FOI.replay.events = {}; foiSay(player, "Replay log cleared."); return false end
end
