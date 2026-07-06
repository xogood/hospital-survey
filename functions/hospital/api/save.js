// 处理 POST 请求，接收 FormData 或 JSON
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: '仅支持 POST' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 解析输入（支持 FormData 和 JSON）
  let input = {};
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    input = await request.json();
  } else {
    const formData = await request.formData();
    for (const [key, value] of formData.entries()) {
      input[key] = value;
    }
  }

  // 业务验证（与 PHP 一致）
  const patientName = (input['患者姓名'] || '').trim();
  const department = (input['就诊科室'] || '').trim();
  if (!patientName) {
    return errorResponse('患者姓名不能为空', 400);
  }
  if (!department) {
    return errorResponse('就诊科室不能为空', 400);
  }

  // 评分字段列表（与 PHP 中的 SCORE_FIELDS 对应）
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

  // 验证每个评分（如果填写则必须为 1-10 整数）
  for (const field of scoreFields) {
    const val = (input[field] || '').trim();
    if (val !== '') {
      const num = Number(val);
      if (!Number.isInteger(num) || num < 1 || num > 10) {
        return errorResponse('评分项必须为 1~10 的整数或留空', 400);
      }
    }
  }

  // 准备插入数据
  const now = new Date();
  const surveyDate = now.toISOString().slice(0, 10);  // YYYY-MM-DD
  const month = surveyDate.slice(0, 7);               // YYYY-MM

  // 构造数据库列和值（使用双引号括起中文字段名）
  const columns = [
    'month',
    '"调查日期"',
    '"患者姓名"',
    '"就诊科室"',
    ...scoreFields.map(f => `"${f}"`),
    '"是否有收受红包情况"',
    '"备注"'
  ].join(',');

  const placeholders = columns.split(',').map(() => '?').join(',');

  // 构建参数数组
  const params = [
    month,
    surveyDate,
    patientName,
    department,
    ...scoreFields.map(f => (input[f] || '').trim() || null),
    (input['是否有收受红包情况'] || '').trim() || null,
    (input['备注'] || '').trim() || null
  ];

  try {
    const stmt = env.DB.prepare(`INSERT INTO satisfaction_records (${columns}) VALUES (${placeholders})`);
    const result = await stmt.bind(...params).run();

    // 获取新插入的 id
    const newId = result.meta.last_row_id;

    // 查询刚插入的记录，返回给前端（格式与 PHP 一致）
    const selectStmt = env.DB.prepare(`SELECT id AS "序号", * FROM satisfaction_records WHERE id = ?`);
    const record = await selectStmt.bind(newId).first();

    return new Response(JSON.stringify({
      success: true,
      message: '保存成功',
      data: record,
      month: month
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error(err);
    return errorResponse('数据库写入失败', 500);
  }
}

function errorResponse(message, status = 400) {
  return new Response(JSON.stringify({ success: false, message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}