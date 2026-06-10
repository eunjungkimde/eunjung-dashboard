 
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const { type } = event.queryStringParameters || {};
  const DB_MAP = {
    checklist: process.env.NOTION_CHECKLIST_DB,
    tasks: process.env.NOTION_TASKS_DB,
    memo: process.env.NOTION_MEMO_DB
  };

  const dbId = DB_MAP[type];
  if (!dbId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid type' }) };
  }

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        page_size: 100
      })
    });

    const data = await res.json();

    if (type === 'checklist') {
      const items = data.results.map(p => ({
        id: p.id,
        text: p.properties['할 일']?.title?.[0]?.plain_text || '',
        project: p.properties['프로젝트']?.select?.name || '',
        status: p.properties['상태']?.select?.name || '할 일',
        deadline: p.properties['마감일']?.date?.start || '',
        priority: p.properties['우선순위']?.select?.name || ''
      }));
      return { statusCode: 200, headers, body: JSON.stringify(items) };
    }

    if (type === 'tasks') {
      const items = data.results.map(p => ({
        id: p.id,
        text: p.properties['태스크']?.title?.[0]?.plain_text || '',
        project: p.properties['프로젝트']?.select?.name || '',
        date: p.properties['날짜']?.date?.start || '',
        hours: p.properties['소요시간']?.rich_text?.[0]?.plain_text || '',
        done: p.properties['완료']?.checkbox || false,
        block: p.properties['블록']?.select?.name || ''
      }));
      return { statusCode: 200, headers, body: JSON.stringify(items) };
    }

    if (type === 'memo') {
      const items = data.results.map(p => ({
        id: p.id,
        text: p.properties['내용']?.title?.[0]?.plain_text || '',
        date: p.properties['날짜']?.date?.start || '',
        tag: p.properties['태그']?.select?.name || ''
      }));
      return { statusCode: 200, headers, body: JSON.stringify(items) };
    }

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
