To inherit from this class:

  Define these methods:
    rawSend: (data) => # send data untouched to mpd
 
  Call these methods:
    receive: (data) => # when you get data from mpd
    handleConnectionStart: => # when you first connect

API:

  library structure: {
    artists: [sorted list of {artist structure}],
    track_table: {"track file" => {track structure}},
    artist_table: {"artist name" => {artist structure}},
    album_table: {"album key" => {album structure}},
  }
  artist structure: {
    name: "Artist Name",
    albums: [sorted list of {album structure}],
    pos: 29, # index into library.artists structure
  }
  album structure:  {
    name: "Album Name",
    year: 1999,
    tracks: [sorted list of {track structure}],
    artist: {artist structure}
    pos: 13, # index into artist.albums structure
    key: "album name", # the index into album_table
  }
  track structure: {
    name: "Track Name",
    track: 9,
    artist_name: "Artist Name",
    album: {album structure},
    album_artist_name: "Daft Punk",
    file: "Obtuse/Cloudy Sky/06. Temple of Trance.mp3",
    time: 263, # length in seconds
    pos: 99, # index into album.track structure
  }
  playlist structure: {
    item_list: [sorted list of {playlist item structure}],
    item_table: {song id => {playlist item structure}}
  }
  playlist item structure: {
    id: 7, # playlist song id
    track: {track structure},
    pos: 2, # 0-based position in the playlist
  }
  status structure: {
    volume: .89, # float 0-1
    repeat: true, # whether we're in repeat mode. see also `single`
    random: false, # random mode makes the next song random within the playlist
    single: true, # true -> repeat the current song, false -> repeat the playlist
    consume: true, # true -> remove tracks from playlist after done playing
    state: "play", # or "stop" or "pause"
    time: 234, # length of song in seconds
    track_start_date: new Date(), # absolute datetime of now - position of current time
    bitrate: 192, # number of kbps
    current_item: {playlist item structure},
  }
  search_results structure mimics library structure
