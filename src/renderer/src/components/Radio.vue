<template>
  <div class="radio-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="brand">
          <div class="brand-icon">
            <RadioIcon :size="20" />
          </div>
          <span class="brand-name">Chrono Radio</span>
        </div>

        <div class="sidebar-actions">
          <button
            @click="toggleShuffle"
            class="action-btn"
            :class="{ primary: isShuffle }"
            title="Toggle Shuffle"
          >
            <Shuffle :size="18" />
          </button>

          <button
            @click="toggleLoop"
            class="action-btn"
            :class="{ primary: isLoop }"
            title="Toggle Loop"
          >
            <Repeat :size="18" />
          </button>

          <div
            class="ctx-divider-vertical"
            style="width: 1px; background: var(--border-color); margin: 0 4px"
          ></div>

          <button @click="openDialog('folder')" class="action-btn" title="New Folder">
            <FolderPlus :size="18" />
          </button>
          <button
            @click="openDialog('video')"
            class="action-btn primary"
            title="Add Video/Playlist"
          >
            <Plus :size="18" />
          </button>
        </div>
      </div>

      <nav class="library-nav">
        <div v-if="folders.length === 0" class="empty-library">
          <div class="empty-icon-wrapper">
            <Music :size="32" />
          </div>
          <p>Library empty</p>
        </div>

        <div class="scroll-container">
          <div v-for="(folder, fIdx) in allFolders" :key="folder.id" class="folder-group">
            <div
              class="folder-row"
              :class="{ active: currentFolderId === folder.id }"
              @click="toggleFolder(folder.id)"
            >
              <div class="folder-main">
                <span class="chevron-wrapper" :class="{ rotated: expandedFolders.has(folder.id) }">
                  <ChevronRight :size="14" />
                </span>
                <span class="folder-icon">
                  <Folder :size="16" />
                </span>
                <span class="folder-name">{{ folder.name }}</span>
                <span class="count-badge">{{ getFolderVideos(folder.id).length }}</span>
              </div>

              <div v-if="folder.id !== UNGROUPED_ID" class="folder-options" @click.stop>
                <button @click="toggleMenu('folder', folder.id)" class="options-trigger">
                  <MoreHorizontal :size="16" />
                </button>

                <transition name="fade">
                  <div v-if="activeMenu === `folder-${folder.id}`" class="context-menu">
                    <div class="ctx-group">
                      <button
                        @click="moveFolderOrder(folder, -1)"
                        class="ctx-item"
                        :disabled="fIdx === 1"
                      >
                        <ArrowUp :size="14" /> Move Up
                      </button>
                      <button
                        @click="moveFolderOrder(folder, 1)"
                        class="ctx-item"
                        :disabled="fIdx === allFolders.length - 1"
                      >
                        <ArrowDown :size="14" /> Move Down
                      </button>
                    </div>
                    <div class="ctx-divider"></div>
                    <button @click="openDialog('video', folder.id)" class="ctx-item">
                      <Plus :size="14" /> Add Content
                    </button>
                    <button @click="openDialog('folder', null, folder)" class="ctx-item">
                      <Edit2 :size="14" /> Rename
                    </button>
                    <div class="ctx-divider"></div>
                    <button @click="deleteFolder(folder.id)" class="ctx-item danger">
                      <Trash2 :size="14" /> Delete
                    </button>
                  </div>
                </transition>
              </div>
            </div>

            <transition name="slide-down">
              <div v-if="expandedFolders.has(folder.id)" class="videos-list">
                <div
                  v-for="(video, idx) in getFolderVideos(folder.id)"
                  :key="video.id"
                  class="video-row"
                  :class="{
                    playing: currentVideo?.id === video.id,
                    'is-active': currentVideo?.id === video.id
                  }"
                  @click="selectVideo(video)"
                >
                  <div class="video-status">
                    <div v-if="currentVideo?.id === video.id && isPlaying" class="equalizer">
                      <span></span><span></span><span></span>
                    </div>
                    <div
                      v-else-if="currentVideo?.id === video.id && !isPlaying"
                      class="paused-indicator"
                    >
                      <Pause :size="10" fill="currentColor" />
                    </div>
                    <ListMusic v-else-if="video.isPlaylist" :size="14" class="icon-playlist" />
                    <Music v-else :size="14" />
                  </div>

                  <span class="video-title">{{ video.name }}</span>
                  <span v-if="video.isPlaylist" class="badge-playlist">PLAYLIST</span>

                  <div class="video-options" @click.stop>
                    <button @click="toggleMenu('video', video.id)" class="options-trigger">
                      <MoreVertical :size="14" />
                    </button>

                    <transition name="fade">
                      <div
                        v-if="activeMenu === `video-${video.id}`"
                        class="context-menu right-aligned"
                      >
                        <div class="ctx-group">
                          <button
                            @click="moveVideoOrder(video, -1)"
                            class="ctx-item"
                            :disabled="idx === 0"
                          >
                            <ArrowUp :size="14" /> Move Up
                          </button>
                          <button
                            @click="moveVideoOrder(video, 1)"
                            class="ctx-item"
                            :disabled="idx === getFolderVideos(folder.id).length - 1"
                          >
                            <ArrowDown :size="14" /> Move Down
                          </button>
                        </div>
                        <div class="ctx-divider"></div>
                        <button
                          v-if="folders.length > 0"
                          @click="openDialog('move', null, video)"
                          class="ctx-item"
                        >
                          <FolderInput :size="14" /> Move to...
                        </button>
                        <button @click="openDialog('video', null, video)" class="ctx-item">
                          <Edit2 :size="14" /> Edit
                        </button>
                        <div class="ctx-divider"></div>
                        <button @click="deleteVideo(video.id)" class="ctx-item danger">
                          <Trash2 :size="14" /> Delete
                        </button>
                      </div>
                    </transition>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </nav>
    </aside>

    <main class="main-stage">
      <div class="player-container">
        <div id="youtube-player" class="video-responsive"></div>

        <div v-if="!currentVideo" class="placeholder-stage">
          <div class="placeholder-content">
            <div class="icon-stack">
              <RadioIcon :size="64" />
            </div>
            <h2>Chrono Radio</h2>
            <p>Select a track or playlist to start</p>
          </div>
        </div>
      </div>

      <div class="control-bar" :class="{ disabled: !currentVideo }">
        <div class="track-details">
          <div v-if="currentVideo" class="info-block">
            <span class="current-title">{{ currentVideo.name }}</span>
            <span class="current-context">
              <Folder :size="12" /> {{ currentFolderName }}
              <span v-if="currentVideo.isPlaylist" class="meta-separator">• Playlist</span>
            </span>
          </div>
        </div>

        <div class="transport-controls">
          <button
            @click="playPrevious"
            :disabled="!hasPrevious && !isShuffle"
            class="control-btn secondary"
          >
            <SkipBack :size="20" />
          </button>

          <button @click="togglePlay" class="control-btn play-pause-btn">
            <Pause v-if="isPlaying" :size="24" fill="currentColor" />
            <Play v-else :size="24" fill="currentColor" class="play-icon-offset" />
          </button>

          <button
            @click="playNext"
            :disabled="!hasNext && !isShuffle"
            class="control-btn secondary"
          >
            <SkipForward :size="20" />
          </button>
        </div>

        <div class="extra-controls"></div>
      </div>
    </main>

    <transition name="fade">
      <div v-if="dialog.show" class="overlay" @click.self="closeDialog">
        <div class="modal">
          <div class="modal-header">
            <h3>{{ dialogTitle }}</h3>
            <button @click="closeDialog" class="close-btn"><X :size="20" /></button>
          </div>

          <div class="modal-body">
            <template v-if="dialog.type === 'folder'">
              <div class="input-group">
                <label>Folder Name</label>
                <input
                  v-model="dialog.data.name"
                  maxlength="50"
                  type="text"
                  placeholder="e.g. Chill Mix"
                  @keyup.enter="saveDialog"
                  v-focus
                />
              </div>
            </template>

            <template v-if="dialog.type === 'video'">
              <div class="input-group">
                <label>Title</label>
                <input
                  v-model="dialog.data.name"
                  maxlength="100"
                  placeholder="Song or Playlist title"
                  v-focus
                />
              </div>
              <div class="input-group">
                <label>YouTube Link (Video or Playlist)</label>
                <input
                  v-model="dialog.data.link"
                  placeholder="https://youtube.com/watch?v=... or &list=..."
                />
                <div v-if="dialog.data.link" class="validation-msg">
                  <span
                    v-if="getLinkType(dialog.data.link) === 'playlist'"
                    class="valid-badge playlist"
                  >
                    ✓ Valid Playlist detected
                  </span>
                  <span v-else-if="getLinkType(dialog.data.link) === 'video'" class="valid-badge">
                    ✓ Valid Video detected
                  </span>
                </div>
              </div>
              <div class="input-group" v-if="allFolders.length > 0 && !dialog.editing">
                <label>Add to Folder</label>
                <select v-model="dialog.data.folderId">
                  <option v-for="folder in allFolders" :key="folder.id" :value="folder.id">
                    {{ folder.name }}
                  </option>
                </select>
              </div>
            </template>

            <template v-if="dialog.type === 'move'">
              <div class="input-group">
                <label>Select Destination</label>
                <select v-model="dialog.data.targetFolderId">
                  <option v-for="folder in allFolders" :key="folder.id" :value="folder.id">
                    {{ folder.name }}
                  </option>
                </select>
              </div>
            </template>
          </div>

          <div class="modal-footer">
            <button @click="closeDialog" class="btn text-btn">Cancel</button>
            <button @click="saveDialog" :disabled="!isDialogValid" class="btn primary-btn">
              {{ dialog.type === 'move' ? 'Move' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import {
  Radio as RadioIcon,
  Music,
  Plus,
  FolderPlus,
  Folder,
  ListMusic,
  SkipBack,
  SkipForward,
  Edit2,
  Trash2,
  ChevronRight,
  FolderInput,
  MoreVertical,
  MoreHorizontal,
  Play,
  Pause,
  X,
  ArrowUp,
  ArrowDown,
  Shuffle,
  Repeat
} from 'lucide-vue-next'

// ============================================
// CONSTANTS
// ============================================

const UNGROUPED_ID = 'ungrouped'
const DATA_VERSION = 1

// ============================================
// STATE
// ============================================

const folders = ref([])
const videos = ref([])
const currentVideo = ref(null)
const currentFolderId = ref(null)
const isPlaying = ref(false)
const expandedFolders = ref(new Set([UNGROUPED_ID]))
const activeMenu = ref(null)

// Nuovi stati per Shuffle e Loop
const isShuffle = ref(false)
const isLoop = ref(false)

let ytPlayer = null

const dialog = ref({
  show: false,
  type: null,
  editing: false,
  data: {}
})

// ============================================
// CUSTOM DIRECTIVES
// ============================================

const vFocus = {
  mounted: (el) => el.focus()
}

// ============================================
// YOUTUBE URL PARSING
// ============================================

// (Codice di parsing URL mantenuto identico)
function extractVideoId(url) {
  if (!url) return null
  const cleanUrl = url.trim()
  const videoPatterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /\/v\/([a-zA-Z0-9_-]{11})/,
    /\/live\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
    /\/watch\/([a-zA-Z0-9_-]{11})/,
    /attribution_link.*?[?&]v=([a-zA-Z0-9_-]{11})/
  ]
  for (const pattern of videoPatterns) {
    const match = cleanUrl.match(pattern)
    if (match && match[1]) return match[1]
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) return cleanUrl
  return null
}

function extractPlaylistId(url) {
  if (!url) return null
  const cleanUrl = url.trim()
  const listParamMatch = cleanUrl.match(/[?&]list=([a-zA-Z0-9_-]+)/)
  if (listParamMatch && listParamMatch[1]) return listParamMatch[1]
  const directPlaylistPatterns = [
    /^(PL[a-zA-Z0-9_-]{32})$/,
    /^(PL[a-zA-Z0-9_-]{16})$/,
    /^(OLAK5uy_[a-zA-Z0-9_-]+)$/,
    /^(RDMM[a-zA-Z0-9_-]+)$/,
    /^(RDCLAK5uy_[a-zA-Z0-9_-]+)$/,
    /^(RD[a-zA-Z0-9_-]{11})$/,
    /^(UU[a-zA-Z0-9_-]{22})$/,
    /^(FL[a-zA-Z0-9_-]{22})$/,
    /^(LL)$/,
    /^(WL)$/,
    /^([a-zA-Z0-9_-]{34})$/
  ]
  for (const pattern of directPlaylistPatterns) {
    const match = cleanUrl.match(pattern)
    if (match && match[1]) return match[1]
  }
  return null
}

function getLinkType(url) {
  if (!url) return null
  const cleanUrl = url.trim()
  const playlistId = extractPlaylistId(cleanUrl)
  if (playlistId) return 'playlist'
  const videoId = extractVideoId(cleanUrl)
  if (videoId) return 'video'
  return null
}

function normalizeYouTubeUrl(type, id) {
  if (!id) return null
  if (type === 'playlist') return `https://www.youtube.com/playlist?list=${id}`
  if (type === 'video') return `https://www.youtube.com/watch?v=${id}`
  return null
}

function extractDataFromUrl(url) {
  if (!url) return { id: null, type: null, originalLink: url, normalizedUrl: null }
  const cleanUrl = url.trim()
  const playlistId = extractPlaylistId(cleanUrl)
  if (playlistId) {
    return {
      id: playlistId,
      type: 'playlist',
      originalLink: url,
      normalizedUrl: normalizeYouTubeUrl('playlist', playlistId)
    }
  }
  const videoId = extractVideoId(cleanUrl)
  if (videoId) {
    return {
      id: videoId,
      type: 'video',
      originalLink: url,
      normalizedUrl: normalizeYouTubeUrl('video', videoId)
    }
  }
  return { id: null, type: null, originalLink: url, normalizedUrl: null }
}

// ============================================
// COMPUTED PROPERTIES
// ============================================

const allFolders = computed(() => [
  { id: UNGROUPED_ID, name: 'Ungrouped Videos', createdAt: 0 },
  ...folders.value
])

const getFolderVideos = (folderId) => {
  return videos.value.filter((v) => (v.folderId || UNGROUPED_ID) === folderId)
}

const currentPlaylist = computed(() => {
  if (!currentFolderId.value) return []
  return getFolderVideos(currentFolderId.value)
})

const currentIndex = computed(() => {
  if (!currentVideo.value || !currentPlaylist.value.length) return -1
  return currentPlaylist.value.findIndex((v) => v.id === currentVideo.value.id)
})

const hasPrevious = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value < currentPlaylist.value.length - 1)

const currentFolderName = computed(() => {
  return allFolders.value.find((f) => f.id === currentFolderId.value)?.name
})

const dialogTitle = computed(() => {
  const { type, editing, data } = dialog.value
  if (type === 'folder') return editing ? 'Rename Folder' : 'Create Folder'
  if (type === 'video') return editing ? 'Edit Content' : 'Add Content'
  if (type === 'move') return `Move "${data.videoName}"`
  return ''
})

const isDialogValid = computed(() => {
  const { type, data } = dialog.value
  if (type === 'folder') return data.name?.trim().length > 0
  if (type === 'video') {
    if (!data.name?.trim() || !data.link?.trim()) return false
    const extracted = extractDataFromUrl(data.link.trim())
    return extracted.id !== null && extracted.type !== null
  }
  if (type === 'move') return true
  return false
})

// ============================================
// YOUTUBE PLAYER
// ============================================

function loadYoutubeAPI() {
  if (!window.YT) {
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
    window.onYouTubeIframeAPIReady = () => {
      /* API ready */
    }
  }
}

function initPlayer(mediaId, isPlaylist) {
  if (!ytPlayer) {
    const playerConfig = {
      height: '100%',
      width: '100%',
      playerVars: {
        autoplay: 1,
        rel: 0,
        controls: 1,
        enablejsapi: 1,
        modestbranding: 1
      },
      events: {
        onStateChange: onPlayerStateChange,
        onReady: (e) => {
          e.target.playVideo()
          isPlaying.value = true
        }
      }
    }

    if (isPlaylist) {
      playerConfig.playerVars.listType = 'playlist'
      playerConfig.playerVars.list = mediaId
    } else {
      playerConfig.videoId = mediaId
    }

    if (document.getElementById('youtube-player')) {
      ytPlayer = new window.YT.Player('youtube-player', playerConfig)
    }
    return
  }

  if (typeof ytPlayer.loadVideoById === 'function') {
    if (isPlaylist) {
      // Come nella versione Capacitor (funzionante): fermare esplicitamente il
      // player prima di caricare la nuova playlist, con un breve ritardo,
      // evita che YouTube resti "agganciato" allo stato della playlist
      // precedente quando si passa da una playlist a un'altra.
      ytPlayer.stopVideo()
      setTimeout(() => {
        ytPlayer.loadPlaylist({
          list: mediaId,
          listType: 'playlist',
          index: 0,
          startSeconds: 0
        })
      }, 100)
    } else {
      ytPlayer.loadVideoById(mediaId)
    }
    isPlaying.value = true
  }
}

function onPlayerStateChange(event) {
  if (event.data === 0) handleVideoEnd()
  if (event.data === 1) isPlaying.value = true
  if (event.data === 2) isPlaying.value = false
}

function handleVideoEnd() {
  // 1. LOGICA LOOP
  // Se loop è attivo, riavvolgiamo il video all'inizio e riproduciamo
  // Questo funziona sia per video singoli che per elementi dentro una playlist
  if (isLoop.value && ytPlayer && typeof ytPlayer.seekTo === 'function') {
    ytPlayer.seekTo(0)
    ytPlayer.playVideo()
    return
  }

  // 2. LOGICA PLAYLIST NATIVA YOUTUBE (se in uso)
  if (
    currentVideo.value?.isPlaylist &&
    ytPlayer &&
    typeof ytPlayer.getPlaylistIndex === 'function'
  ) {
    const idx = ytPlayer.getPlaylistIndex()
    const size = ytPlayer.getPlaylist() ? ytPlayer.getPlaylist().length : 0
    // Se non è l'ultimo video della playlist nativa youtube, lascia fare a youtube
    if (idx < size - 1) return

    // Se è l'ultimo, passiamo al prossimo video "nostro" (nella nostra folder)
    playNext()
    return
  }

  // 3. LOGICA STANDARD (Fine video singolo)
  if (!currentVideo.value?.isPlaylist) {
    playNext()
  }
}

function togglePlay() {
  if (!ytPlayer || typeof ytPlayer.getPlayerState !== 'function') return
  const state = ytPlayer.getPlayerState()
  if (state === 1) ytPlayer.pauseVideo()
  else ytPlayer.playVideo()
}

watch(currentVideo, async (newVal) => {
  if (newVal) {
    await nextTick()
    initPlayer(newVal.contentId, newVal.isPlaylist)
  } else {
    isPlaying.value = false
  }
})

// ============================================
// USER ACTIONS
// ============================================

// Toggle funzioni Shuffle / Loop
function toggleShuffle() {
  isShuffle.value = !isShuffle.value
}

function toggleLoop() {
  isLoop.value = !isLoop.value
}

function toggleFolder(folderId) {
  if (expandedFolders.value.has(folderId)) {
    expandedFolders.value.delete(folderId)
  } else {
    expandedFolders.value.add(folderId)
  }
}

function toggleMenu(type, id) {
  const menuId = `${type}-${id}`
  activeMenu.value = activeMenu.value === menuId ? null : menuId
}

function closeMenus() {
  activeMenu.value = null
}

function selectVideo(video) {
  if (currentVideo.value?.id === video.id) {
    togglePlay()
    return
  }
  currentVideo.value = video
  currentFolderId.value = video.folderId || UNGROUPED_ID
  isPlaying.value = true
  closeMenus()
}

function playNext() {
  const playlist = currentPlaylist.value
  if (!playlist.length) return

  let nextVideo = null

  // LOGICA SHUFFLE
  if (isShuffle.value) {
    // Calcola un indice random
    let randIdx = Math.floor(Math.random() * playlist.length)

    // Piccolo miglioramento UX: se la playlist ha più di 1 elemento,
    // prova ad evitare di ripescare lo stesso brano appena finito.
    if (playlist.length > 1 && playlist[randIdx].id === currentVideo.value?.id) {
      randIdx = (randIdx + 1) % playlist.length
    }

    nextVideo = playlist[randIdx]
  }
  // LOGICA SEQUENZIALE
  else {
    if (!hasNext.value) return
    nextVideo = playlist[currentIndex.value + 1]
  }

  if (nextVideo) selectVideo(nextVideo)
}

function playPrevious() {
  const playlist = currentPlaylist.value
  if (!playlist.length) return

  // Con Shuffle attivo, il tasto "Back" potrebbe comportarsi in modo random o tornare indietro nella history.
  // Per semplicità e coerenza con la richiesta, qui manteniamo la logica sequenziale o random inversa.
  // Tuttavia, spesso Shuffle influenza solo il "Next". Qui applico la stessa logica random per coerenza,
  // oppure mantengo sequenziale. La richiesta specifica shuffle sul "successivo".
  // Lascio il previous sequenziale a meno che non si voglia random anche qui.

  if (!hasPrevious.value && !isShuffle.value) return

  if (isShuffle.value) {
    // Se shuffle è attivo, anche indietro va a caso (comportamento semplificato)
    playNext()
  } else {
    const prevVideo = playlist[currentIndex.value - 1]
    if (prevVideo) selectVideo(prevVideo)
  }
}

// ============================================
// REORDERING
// ============================================

async function moveFolderOrder(folder, direction) {
  closeMenus()
  const currentIdxInFolders = folders.value.findIndex((f) => f.id === folder.id)
  if (currentIdxInFolders === -1) return
  const targetIdxInFolders = currentIdxInFolders + direction
  if (targetIdxInFolders < 0 || targetIdxInFolders >= folders.value.length) return

  const temp = folders.value[currentIdxInFolders]
  folders.value[currentIdxInFolders] = folders.value[targetIdxInFolders]
  folders.value[targetIdxInFolders] = temp
  folders.value = [...folders.value]
  await saveToDatabase()
}

async function moveVideoOrder(video, direction) {
  closeMenus()
  const playlist = currentPlaylist.value
  const currentIdx = playlist.findIndex((v) => v.id === video.id)
  if (currentIdx === -1) return
  const targetIdx = currentIdx + direction
  if (targetIdx < 0 || targetIdx >= playlist.length) return

  const targetVideo = playlist[targetIdx]
  const mainIndexA = videos.value.findIndex((v) => v.id === video.id)
  const mainIndexB = videos.value.findIndex((v) => v.id === targetVideo.id)

  if (mainIndexA !== -1 && mainIndexB !== -1) {
    const temp = videos.value[mainIndexA]
    videos.value[mainIndexA] = videos.value[mainIndexB]
    videos.value[mainIndexB] = temp
    videos.value = [...videos.value]
    await saveToDatabase()
  }
}

// ============================================
// DIALOG MANAGEMENT
// ============================================

function openDialog(type, targetFolderId = null, item = null) {
  closeMenus()
  dialog.value = { show: true, type, editing: !!item, data: {} }

  if (type === 'folder') {
    dialog.value.data = item ? { name: item.name, id: item.id } : { name: '' }
  } else if (type === 'video') {
    if (item) {
      dialog.value.data = {
        name: item.name,
        link: item.link,
        id: item.id
      }
    } else {
      dialog.value.data = {
        name: '',
        link: '',
        folderId:
          targetFolderId ||
          (currentFolderId.value === UNGROUPED_ID ? null : currentFolderId.value) ||
          UNGROUPED_ID
      }
    }
  } else if (type === 'move' && item) {
    dialog.value.data = {
      videoId: item.id,
      videoName: item.name,
      targetFolderId: item.folderId || UNGROUPED_ID
    }
  }
}

function closeDialog() {
  dialog.value = { show: false, type: null, editing: false, data: {} }
}

async function saveDialog() {
  const { type, editing, data } = dialog.value
  if (type === 'folder') {
    const folder = {
      id: editing ? data.id : Date.now(),
      name: data.name.trim(),
      createdAt: editing ? folders.value.find((f) => f.id === data.id)?.createdAt : Date.now()
    }
    if (editing) {
      const idx = folders.value.findIndex((f) => f.id === folder.id)
      folders.value[idx] = folder
    } else {
      folders.value.push(folder)
    }
  } else if (type === 'video') {
    const extracted = extractDataFromUrl(data.link.trim())
    if (!extracted.id || !extracted.type) {
      alert('Invalid YouTube URL. Please check the link.')
      return
    }
    const video = {
      id: editing ? data.id : Date.now(),
      name: data.name.trim(),
      link: extracted.normalizedUrl,
      contentId: extracted.id,
      isPlaylist: extracted.type === 'playlist',
      type: 'youtube',
      folderId: editing
        ? videos.value.find((v) => v.id === data.id)?.folderId
        : data.folderId === UNGROUPED_ID
          ? null
          : data.folderId,
      createdAt: editing ? videos.value.find((v) => v.id === data.id)?.createdAt : Date.now()
    }
    if (editing) {
      const idx = videos.value.findIndex((v) => v.id === video.id)
      videos.value[idx] = video
    } else {
      videos.value.push(video)
    }
  } else if (type === 'move') {
    const idx = videos.value.findIndex((v) => v.id === data.videoId)
    if (idx !== -1) {
      videos.value[idx].folderId = data.targetFolderId === UNGROUPED_ID ? null : data.targetFolderId
    }
  }
  await saveToDatabase()
  closeDialog()
}

// ============================================
// DELETE OPERATIONS
// ============================================

async function deleteFolder(folderId) {
  closeMenus()
  if (!confirm('Permanently delete this folder and all its tracks?')) return
  folders.value = folders.value.filter((f) => f.id !== folderId)
  videos.value = videos.value.filter((v) => v.folderId !== folderId)
  expandedFolders.value.delete(folderId)
  if (currentFolderId.value === folderId) {
    currentVideo.value = null
    currentFolderId.value = null
  }
  await saveToDatabase()
}

async function deleteVideo(videoId) {
  closeMenus()
  videos.value = videos.value.filter((v) => v.id !== videoId)
  if (currentVideo.value?.id === videoId) {
    currentVideo.value = null
  }
  await saveToDatabase()
}

// ============================================
// PERSISTENCE (ELECTRON)
// ============================================

async function loadFromDatabase() {
  try {
    const data = await window.electronAPI.loadRadioData()
    if (data?.version === DATA_VERSION) {
      folders.value = Array.isArray(data.folders) ? data.folders : []
      videos.value = (Array.isArray(data.videos) ? data.videos : []).map((v) => {
        if (v.contentId === undefined || v.isPlaylist === undefined) {
          const extracted = extractDataFromUrl(v.link)
          return {
            ...v,
            isPlaylist: v.isPlaylist ?? extracted.type === 'playlist',
            contentId: v.contentId ?? extracted.id
          }
        }
        return v
      })
    } else {
      folders.value = []
      videos.value = []
    }
  } catch (e) {
    console.error('Database load error:', e)
  }
}

async function saveToDatabase() {
  try {
    await window.electronAPI.saveRadioData(
      JSON.stringify({
        version: DATA_VERSION,
        type: 'youtube',
        folders: folders.value,
        videos: videos.value
      })
    )
  } catch (e) {
    console.error('Database save error:', e)
  }
}

// ============================================
// EVENT HANDLERS
// ============================================

function handleGlobalClick(e) {
  if (!e.target.closest('.folder-options') && !e.target.closest('.video-options')) {
    closeMenus()
  }
}

// ============================================
// LIFECYCLE
// ============================================

onMounted(() => {
  loadFromDatabase()
  loadYoutubeAPI()
  document.addEventListener('click', handleGlobalClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleGlobalClick)
})
</script>
