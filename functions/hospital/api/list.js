export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  // ------ GET：查询列表 ------
  if (method === 'GET') {
    const url = new URL(request.url);
    const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return errorResponse('月份格式错误，必须为 YYYY-MM', 400);
    }

    try {
      const stmt = env.DB.prepare(
        `SELECT id AS "序号", * FROM satisfaction_records WHERE month = ? ORDER BY id ASC`
      );
      const { results } = await stmt.bind(month).all();

      return new Response(JSON.stringify({
        success: true,
        message: '获取成功',
        month: month,
        headers: [], // 不再需要 headers，但保留兼容
        data: results
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.error(err);
      return errorResponse('数据库查询失败', 500);
    }
  }

  // ------ POST：处理更新或删除 ------
  if (method === 'POST') {
    let input;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      input = await request.json();
    } else {
      input = await request.formData();
      const obj = {};
      for (const [key, value] of input.entries()) {
        obj[key] = value;
      }
      input = obj;
    }

    const action = (input.action || '').trim();
    const month = (input.month || '').trim() || new Date().toISOString().slice(0, 7);
    const id = input['序号'] || input.id; // 前端传序号，实际是 id

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return errorResponse('月份格式错误', 400);
    }
    if (!id || !/^\d+$/.test(id)) {
      return errorResponse('序号参数无效', 400);
    }

    // 处理更新
    if (action === 'update') {
      return await handleUpdate(env, month, id, input);
    }

    // 处理删除
    if (action === 'delete') {
      return await handleDelete(env, month, id);
    }

    return errorResponse('无效的操作类型', 400);
  }

  return errorResponse('不支持的请求方式', 405);
}

// ---------- 更新逻辑 ----------
async function handleUpdate(env, month, id, input) {
  // 验证必填
  const patientName = (input['患者姓名'] || '').trim();
  const department = (input['就诊科室'] || '').trim();
  if (!patientName || !department) {
    return errorResponse('患者姓名和就诊科室不能为空', 400);
  }

  const scoreFields = [
    '导诊/体检接待服务态度及效率',
    '接诊医生服务态度和沟通',
    '检验',
    '放射',
    '超声',
    '心电图',
    '神经电生物室',
    '药房服务态度和用药指导',
    '收费员服务态度及效率',
    '其它'
  ];

  for (const field of scoreFields) {
    const val = (input[field] || '').trim();
    if (val !== '') {
      const num = Number(val);
      if (!Number.isInteger(num) || num < 1 || num > 10) {
        return errorResponse('评分项必须为 1~10 的整数或留空', 400);
      }
    }
  }

  // 构建 UPDATE 语句
  const setClauses = [
    '"患者姓名" = ?',
    '"就诊科室" = ?',
    ...scoreFields.map(f => `"${f}" = ?`),
    '"是否有收受红包情况" = ?',
    '"备注" = ?'
  ];
  const params = [
    patientName,
    department,
    ...scoreFields.map(f => (input[f] || '').trim() || null),
    (input['是否有收受红包情况'] || '').trim() || null,
    (input['备注'] || '').trim() || null,
    id, // WHERE 条件
    month // 额外限制月份，防止误操作
  ];

  const sql = `UPDATE satisfaction_records SET ${setClauses.join(', ')} WHERE id = ? AND month = ?`;

  try {
    const stmt = env.DB.prepare(sql);
    const result = await stmt.bind(...params).run();
    if (result.meta.changes === 0) {
      return errorResponse('未找到要更新的记录', 404);
    }

    // 返回更新后的记录
    const selectStmt = env.DB.prepare(`SELECT id AS "序号", * FROM satisfaction_records WHERE id = ?`);
    const record = await selectStmt.bind(id).first();

    return new Response(JSON.stringify({
      success: true,
      message: '更新成功',
      month: month,
      data: record
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error(err);
    return errorResponse('更新失败', 500);
  }
}

// ---------- 删除逻辑 ----------
async function handleDelete(env, month, id) {
  try {
    const stmt = env.DB.prepare(`DELETE FROM satisfaction_records WHERE id = ? AND month = ?`);
    const result = await stmt.bind(id, month).run();
    if (result.meta.changes === 0) {
      return errorResponse('未找到要删除的记录', 404);
    }
    return new Response(JSON.stringify({
      success: true,
      message: '删除成功',
      month: month
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error(err);
    return errorResponse('删除失败', 500);
  }
}

function errorResponse(message, status = 400) {
  return new Response(JSON.stringify({ success: false, message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}