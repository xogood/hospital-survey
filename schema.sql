-- 创建满意度调查记录表
CREATE TABLE IF NOT EXISTS satisfaction_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month TEXT NOT NULL,                          -- 格式 YYYY-MM，用于快速按月查询
    "调查日期" TEXT NOT NULL,                      -- 格式 YYYY-MM-DD
    "患者姓名" TEXT NOT NULL,
    "就诊科室" TEXT NOT NULL,
    "导诊/体检接待服务态度及效率" INTEGER,
    "接诊医生服务态度和沟通" INTEGER,
    "检验" INTEGER,
    "放射" INTEGER,
    "超声" INTEGER,
    "心电图" INTEGER,
    "神经电生物室" INTEGER,
    "药房服务态度和用药指导" INTEGER,
    "收费员服务态度及效率" INTEGER,
    "其它" INTEGER,
    "是否有收受红包情况" TEXT,
    "备注" TEXT
);

-- 为 month 字段创建索引，提升查询性能
CREATE INDEX IF NOT EXISTS idx_month ON satisfaction_records (month);