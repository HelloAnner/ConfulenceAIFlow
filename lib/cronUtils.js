import cron from 'node-cron';

// 计算 cron 表达式的下次执行时间
export function getNextRunTime(cronExpression) {
  try {
    if (!cronExpression || !cron.validate(cronExpression)) {
      return '无效的 cron 表达式';
    }

    // 解析 cron 表达式
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length !== 5 && parts.length !== 6) {
      return '无效的 cron 表达式格式';
    }

    // 简单的下次执行时间计算
    // 这是一个基础实现，实际项目中建议使用专门的库如 node-cron-parser
    const now = new Date();
    const nextRun = new Date(now);

    // 解析各个字段
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // 处理分钟
    if (minute !== '*') {
      const targetMinute = parseInt(minute);
      if (!isNaN(targetMinute) && targetMinute >= 0 && targetMinute <= 59) {
        nextRun.setMinutes(targetMinute);
        nextRun.setSeconds(0);
        nextRun.setMilliseconds(0);
        
        // 如果目标分钟已经过了，移到下一小时
        if (nextRun <= now) {
          nextRun.setHours(nextRun.getHours() + 1);
        }
      }
    }

    // 处理小时
    if (hour !== '*') {
      const targetHour = parseInt(hour);
      if (!isNaN(targetHour) && targetHour >= 0 && targetHour <= 23) {
        nextRun.setHours(targetHour);
        
        // 如果目标时间已经过了，移到下一天
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
      }
    }

    // 处理日期
    if (dayOfMonth !== '*') {
      const targetDay = parseInt(dayOfMonth);
      if (!isNaN(targetDay) && targetDay >= 1 && targetDay <= 31) {
        nextRun.setDate(targetDay);
        
        // 如果目标日期已经过了，移到下一个月
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
      }
    }

    // 处理月份
    if (month !== '*') {
      const targetMonth = parseInt(month) - 1; // JavaScript 月份从0开始
      if (!isNaN(targetMonth) && targetMonth >= 0 && targetMonth <= 11) {
        nextRun.setMonth(targetMonth);
        
        // 如果目标月份已经过了，移到下一年
        if (nextRun <= now) {
          nextRun.setFullYear(nextRun.getFullYear() + 1);
        }
      }
    }

    // 确保下次执行时间在未来
    if (nextRun <= now) {
      // 根据最小的时间单位增加时间
      if (minute !== '*') {
        nextRun.setHours(nextRun.getHours() + 1);
      } else {
        nextRun.setMinutes(nextRun.getMinutes() + 1);
      }
    }

    return nextRun.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

  } catch (error) {
    console.error('计算下次执行时间失败:', error);
    return '计算失败';
  }
}

// 验证 cron 表达式
export function validateCronExpression(cronExpression) {
  try {
    return cron.validate(cronExpression);
  } catch (error) {
    return false;
  }
}

// 获取 cron 表达式的描述
export function describeCronExpression(cronExpression) {
  try {
    if (!validateCronExpression(cronExpression)) {
      return '无效的 cron 表达式';
    }

    const parts = cronExpression.trim().split(/\s+/);
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    let description = '';

    // 构建描述
    if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      description = '每分钟执行';
    } else if (hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      description = `每小时的第 ${minute} 分钟执行`;
    } else if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      description = `每天 ${hour}:${minute.padStart(2, '0')} 执行`;
    } else if (month === '*' && dayOfWeek === '*') {
      description = `每月 ${dayOfMonth} 日 ${hour}:${minute.padStart(2, '0')} 执行`;
    } else {
      // 复杂表达式，返回基本信息
      description = `定时执行 (${cronExpression})`;
    }

    return description;
  } catch (error) {
    return '无法解析表达式';
  }
}

// 常用的 cron 表达式模板
export const cronTemplates = {
  everyMinute: '* * * * *',
  every5Minutes: '*/5 * * * *',
  every10Minutes: '*/10 * * * *',
  every15Minutes: '*/15 * * * *',
  every30Minutes: '*/30 * * * *',
  everyHour: '0 * * * *',
  every2Hours: '0 */2 * * *',
  every6Hours: '0 */6 * * *',
  every12Hours: '0 */12 * * *',
  daily: '0 0 * * *',
  dailyAt9AM: '0 9 * * *',
  dailyAt6PM: '0 18 * * *',
  weekly: '0 0 * * 0',
  weeklyMonday: '0 0 * * 1',
  monthly: '0 0 1 * *',
  yearly: '0 0 1 1 *'
};

// 获取模板描述
export function getTemplateDescription(templateKey) {
  const descriptions = {
    everyMinute: '每分钟',
    every5Minutes: '每5分钟',
    every10Minutes: '每10分钟',
    every15Minutes: '每15分钟',
    every30Minutes: '每30分钟',
    everyHour: '每小时',
    every2Hours: '每2小时',
    every6Hours: '每6小时',
    every12Hours: '每12小时',
    daily: '每天午夜',
    dailyAt9AM: '每天上午9点',
    dailyAt6PM: '每天下午6点',
    weekly: '每周日午夜',
    weeklyMonday: '每周一午夜',
    monthly: '每月1日午夜',
    yearly: '每年1月1日午夜'
  };
  
  return descriptions[templateKey] || '未知模板';
}