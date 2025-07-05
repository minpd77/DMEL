// 지도 변수
let map;

// CSV 주소 데이터 URL
const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQpveOpTjSLo3ZOFfCaoqJlknJXl0FyhmsAy7ICy-L_EsGun7Tf9uCqZbp97_yXYQwx-p_BlTpSouwn/pub?gid=381852124&single=true&output=csv';

// 카카오 지도 초기화 함수
function initMap() {
  map = new kakao.maps.Map(document.getElementById('map'), {
    center: new kakao.maps.LatLng(37.5665, 126.9780),
    level: 7
  });

  loadCsvAndAddMarkers();
}

// CSV 파싱 함수 (간단히 쉼표 기준, 실제 상황에 맞게 보완 가능)
function parseCsv(text) {
  const lines = text.trim().split('\n');
  return lines.map(line => line.split(','));
}

// 주소 → 좌표 변환 및 마커 추가
function geocodeAndAddMarker(address, label, color, count) {
  const geocoder = new kakao.maps.services.Geocoder();

  geocoder.addressSearch(address, function(result, status) {
    if (status === kakao.maps.services.Status.OK) {
      const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
      const marker = new kakao.maps.Marker({
        map: map,
        position: coords,
        title: label,
        // 마커 색상 등은 커스텀 아이콘을 만들어야 하지만 기본 마커로 일단 표시
      });

      // 마커에 인포윈도우 붙이기
      const infowindow = new kakao.maps.InfoWindow({
        content: `<div>${label}${count > 1 ? ` (${count})` : ''}<br>${address}</div>`
      });

      kakao.maps.event.addListener(marker, 'click', function() {
        infowindow.open(map, marker);
      });
    } else {
      console.log(`주소 변환 실패: ${address}`);
    }
  });
}

// CSV 불러와서 마커 찍기
async function loadCsvAndAddMarkers() {
  const response = await fetch(csvUrl);
  const csvText = await response.text();
  const rows = parseCsv(csvText);

  // G: 7번째, AF: 32번째, S: 19번째, K: 11번째 열 인덱스(0부터)
  const addrIdx = 6;
  const nameIdx = 31;
  const teamIdx = 18;
  const dateIdx = 10;

  // 주소별 데이터 집계
  const dataByAddr = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const addr = row[addrIdx];
    if (!addr) continue;

    if (!dataByAddr[addr]) {
      dataByAddr[addr] = { count: 0, names: [], teams: [], hasDate: false };
    }
    dataByAddr[addr].count++;
    dataByAddr[addr].names.push(row[nameIdx] || '');
    dataByAddr[addr].teams.push(row[teamIdx] || '');
    if (row[dateIdx]) dataByAddr[addr].hasDate = true;
  }

  // 각 주소별로 마커 생성
  for (const addr in dataByAddr) {
    const info = dataByAddr[addr];

    // 팀별 색상 지정 (예: 강남팀=green, 강북팀=blue, 기본=red, 날짜 있으면 회색)
    let color = info.hasDate ? 'gray' : 
      (info.teams[0] === '강남팀' ? 'green' : 
      (info.teams[0] === '강북팀' ? 'blue' : 'red'));

    let label = info.names[0];
    if (info.count > 1) label += ` (${info.count})`;

    geocodeAndAddMarker(addr, label, color, info.count);
  }
}

// DOM 로드 후 지도 초기화
window.onload = initMap;
