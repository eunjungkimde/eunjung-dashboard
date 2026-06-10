
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const { text, dashboardState } = JSON.parse(event.body || '{}');

  const sys = `너는 은정의 프리랜서 대시보드 AI야. 오늘: ${new Date().toLocaleDateString('ko-KR')}.

현재 프로젝트 체크리스트:
${JSON.stringify(dashboardState)}

프로젝트명 정확히: "2D Café DA", "PHOTODA", "독방", "Kims So", "포트폴리오"

사용자 요청 분석 후 반드시 이 형식으로만 답해:
[한두 줄 확인 메시지]
###COMMANDS###
[{"action":"add|complete|delete|toggleTask","type":"checklist|tasks","project":"프로젝트명","text":"할일","date":"날짜","done":true}]

명령 없으면 []. JSON 외 텍스트 없이 딱 이 형식만.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: sys,
        messages: [{ role: 'user', content: text }]
      })
    });

    const data = await res.json();
    const raw = data?.content?.[0]?.text || '';
    const parts = raw.split('###COMMANDS###');
    const msg = (parts[0] || '').trim();
    let cmds = [];
    if (parts[1]) {
      try { cmds = JSON.parse(parts[1].trim()); } catch (e) {}
    }
    return { statusCode: 200, headers, body: JSON.stringify({ msg, cmds }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
