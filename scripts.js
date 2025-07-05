const NAVER_CLIENT_ID = 'NAVER_CLIENT_ID';       // 워크플로우에서 치환
const NAVER_CLIENT_SECRET = 'NAVER_CLIENT_SECRET'; // 워크플로우에서 치환

const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQpveOpTjSLo3ZOFfCaoqJlknJXl0FyhmsAy7ICy-L_EsGun7Tf9uCqZbp97_yXYQwx-p_BlTpSouwn/pub?gid=381852124&single=true&output=csv';

function loadNaverMapScript() {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_CLIENT_ID}`;
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

async function geocodeAddress(address) {
  const url = `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: {
      'X-NCP-APIGW-API-KEY-ID': NAVER_CLIENT_ID,
      'X-NCP-APIGW-API-KEY': NAVER_CLIENT_SECRET,
    }
  });
  const data = await res.json();
  if (data.addresses && data.addresses.length > 0) {
    return { lat: data.addresses[0].y, lng: data.addresses[0].x };
  }
  return null;
}

function parseCsv(text) {
  const lines = text.trim().split('\n');
  const rows = lines.map(line => line.split(','));
  return rows;
}

async function main() {
  await loadNaverMapScript();

  const map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(37.5665, 126.9780),
    zoom: 11
  });

  const res = await fetch(csvUrl);
  const csvText = await res.text();
  const rows = parseCsv(csvText);

  // 인덱스 지정 (0부터)
  const addrIdx = 6;   // G열
  const nameIdx = 31;  // AF열
  const teamIdx = 18;  // S열
  const dateIdx = 10;  // K열

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

  // 주소별로 좌표 구하고 마커 찍기
  for (const addr in dataByAddr) {
    const info = dataByAddr[addr];
    const latlng = await geocodeAddress(addr);
    if (!latlng) continue;

    let color = info.hasDate ? 'gray' : (info.teams[0] === '강남팀' ? 'green' : (info.teams[0] === '강북팀' ? 'blue' : 'red'));
    let label = info.names[0];
    if (info.count > 1) label += ` (${info.count})`;

    const marker = new naver.maps.Circle({
      map: map,
      center: new naver.maps.LatLng(latlng.lat, latlng.lng),
      radius: 50,
      strokeColor: color,
      fillColor: color,
      fillOpacity: 0.6
    });

    const infowindow = new naver.maps.InfoWindow({
      content: `<b>${label}</b><br>${addr}`
    });

    marker.addListener('click', () => {
      infowindow.open(map, marker);
    });
  }
}

window.onload = main;
