 
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const body = JSON.parse(event.body || '{}');
  const { action, type, id, data } = body;

  const DB_MAP = {
    checklist: process.env.NOTION_CHECKLIST_DB,
    tasks: process.env.NOTION_TASKS_DB,
    memo: process.env.NOTION_MEMO_DB
  };

  const NOTION_HEADERS = {
    'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json'
  };

  try {
    // 추가
    if (action === 'add') {
      const dbId = DB_MAP[type];
      let properties = {};

      if (type === 'checklist') {
        properties = {
          '할 일': { title: [{ text: { content: data.text } }] },
          '프로젝트': data.project ? { select: { name: data.project } } : undefined,
          '상태': { select: { name: data.status || '할 일' } },
          '우선순위': data.priority ? { select: { name: data.priority } } : undefined,
          '마감일': data.deadline ? { date: { start: data.deadline } } : undefined
        };
      } else if (type === 'tasks') {
        properties = {
          '태스크': { title: [{ text: { content: data.text } }] },
          '프로젝트': data.project ? { select: { name: data.project } } : undefined,
          '날짜': data.date ? { date: { start: data.date } } : undefined,
          '소요시간': data.hours ? { rich_text: [{ text: { content: data.hours } }] } : undefined,
          '완료': { checkbox: data.done || false },
          '블록': data.block ? { select: { name: data.block } } : undefined
        };
      } else if (type === 'memo') {
        properties = {
          '내용': { title: [{ text: { content: data.text } }] },
          '날짜': { date: { start: new Date().toISOString().split('T')[0] } },
          '태그': data.tag ? { select: { name: data.tag } } : undefined
        };
      }

      // undefined 제거
      Object.keys(properties).forEach(k => properties[k] === undefined && delete properties[k]);

      const res = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: NOTION_HEADERS,
        body: JSON.stringify({ parent: { database_id: dbId }, properties })
      });
      const result = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify({ id: result.id }) };
    }

    // 완료 토글
    if (action === 'complete') {
      const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
        method: 'PATCH',
        headers: NOTION_HEADERS,
        body: JSON.stringify({
          properties: {
            '상태': { select: { name: data.done ? '완료' : '할 일' } }
          }
        })
      });
      await res.json();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // 태스크 완료 토글
    if (action === 'toggleTask') {
      const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
        method: 'PATCH',
        headers: NOTION_HEADERS,
        body: JSON.stringify({
          properties: { '완료': { checkbox: data.done } }
        })
      });
      await res.json();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    // 삭제 (아카이브)
    if (action === 'delete') {
      const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
        method: 'PATCH',
        headers: NOTION_HEADERS,
        body: JSON.stringify({ archived: true })
      });
      await res.json();
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
