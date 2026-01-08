export type SupportedLanguage = 'cmn-CN' | 'en-US' | 'ja-JP' | 'fr-FR'

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  'cmn-CN',
  'en-US',
  'ja-JP',
  'fr-FR'
]

export const translations: Record<SupportedLanguage, any> = {
  'cmn-CN': {
    app: {
      name: '面宝',
      fullName: '面宝 Bready',
      tagline: '拿 Offer 从未如此简单',
      subtagline: 'AI 面试协作，让你稳住节奏'
    },
    common: {
      loading: '加载中...',
      loadingShort: '正在加载...',
      cancel: '取消',
      close: '关闭',
      back: '返回',
      delete: '删除',
      save: '保存',
      confirm: '确认',
      exit: '退出',
      start: '开始',
      settings: '设置',
      later: '稍后再说',
      currentUser: '当前用户',
      none: '无',
      minutes: '{{count}}分钟'
    },
    form: {
      validation: {
        required: '此字段为必填项',
        requiredHint: '请输入内容',
        tooLong: '内容不能超过{{max}}个字符',
        count: '当前{{count}}个字符',
        counter: '{{count}}/{{max}} 字符'
      },
      autosave: {
        saving: '保存中...',
        savedAt: '草稿已自动保存于 {{time}}',
        editing: '正在编辑...'
      }
    },
    home: {
      headline: '拿 Offer 从未如此简单',
      subhead: 'AI 协作，稳住节奏',
      start: '开始',
      myPreparations: '我的准备',
      emptyTitle: '开启你的第一次面试准备',
      emptyDescription: '创建一个准备项，上传你的简历或职位描述，让 AI 帮你分析并进行模拟面试。',
      createNow: '立即创建',
      viewAll: '查看全部 {{count}} 个',
      analyzing: '分析中'
    },
    slogans: {
      main: [
        '面试紧张？放轻松',
        '面宝协作，胜券在握',
        '面试？小意思'
      ]
    },
    select: {
      title: '准备面试',
      language: '语言',
      purpose: '目的',
      empty: '还没有准备项',
      confirm: '确定',
      quickStart: '不准备，直接开始'
    },
    purposes: {
      interview: '面试',
      sales: '销售',
      meeting: '会议'
    },
    createPrep: {
      title: '选择准备类型',
      subtitle: '选择你要创建的准备类型',
      types: {
        interview: {
          title: '面试',
          description: '准备求职面试，分析岗位匹配度'
        },
        sales: {
          title: '销售',
          description: '准备客户拜访，制定销售策略'
        },
        meeting: {
          title: '会议',
          description: '准备重要会议，整理议程要点'
        }
      }
    },
    salesPrep: {
      titleCreate: '创建销售准备',
      titleEdit: '编辑销售准备',
      name: {
        title: '准备名称',
        placeholder: '例如：XX公司销售拜访'
      },
      clientInfo: {
        title: '客户信息',
        placeholder: '请输入客户公司名称、行业、规模、主要业务、决策人信息等...'
      },
      productInfo: {
        title: '产品/服务信息',
        placeholder: '请输入要推销的产品或服务详情、核心卖点、价格策略等...'
      },
      salesGoal: {
        title: '销售目标',
        placeholder: '请输入本次拜访的销售目标、预期成果、关键里程碑等...'
      }
    },
    meetingPrep: {
      titleCreate: '创建会议准备',
      titleEdit: '编辑会议准备',
      name: {
        title: '准备名称',
        placeholder: '例如：Q4季度总结会议'
      },
      meetingTopic: {
        title: '会议主题',
        placeholder: '请输入会议的主题、背景、目的等...'
      },
      participants: {
        title: '参会人员',
        placeholder: '请输入参会人员名单、职位、角色等...'
      },
      agenda: {
        title: '会议议程',
        placeholder: '请输入会议议程安排、时间分配等...'
      },
      keyPoints: {
        title: '关键要点',
        placeholder: '请输入需要讨论的关键问题、决策事项、预期成果等...'
      }
    },
    languages: {
      'cmn-CN': '中文',
      'en-US': 'English',
      'ja-JP': '日本語',
      'fr-FR': 'Français'
    },
    welcome: {
      title: '面宝',
      tagline: '面试紧张？放轻松',
      features: {
        collaboration: {
          title: '智能协作',
          items: ['简历分析', '实时提词']
        },
        audio: {
          title: '音频技术',
          items: ['低延迟响应', '无损音频处理']
        },
        privacy: {
          title: '隐私安全',
          items: ['反检测', '数据存于本地']
        }
      },
      cta: '为我的面试做好准备',
      skip: '稍后再说'
    },
    collaboration: {
      title: '协作模式',
      copySuccess: '复制成功',
      status: {
        initializing: '正在初始化...',
        checkingPermissions: '检查系统权限...',
        permissionsIncomplete: '权限未完全设置',
        permissionsFailed: '权限检查失败',
        connecting: '正在连接 AI 服务...',
        apiKeyMissing: 'API 密钥未配置',
        audioStarting: '正在启动音频捕获...',
        audioFailed: '音频捕获失败',
        ready: '准备就绪',
        waitingReady: '等待 AI 就绪...',
        connectFailed: '连接失败',
        initFailed: '初始化失败',
        reconnecting: '正在重连...',
        reconnectFailedRetry: '重连失败，请稍后重试',
        reconnectFailed: '重连失败',
        disconnected: '连接已断开',
        preparing: '正在准备协作模式...',
        switchingAudio: '正在切换音频模式...',
        switched: '已切换到 {{mode}}',
        switchFailed: '音频模式切换失败',
        browserPreview: '浏览器预览模式',
        browserSwitched: '已切换到 {{mode}}（浏览器预览）'
      },
      audioMode: {
        system: {
          label: '在线面试模式',
          description: '捕获系统音频，适用于在线面试'
        },
        microphone: {
          label: '麦克风模式',
          description: '使用麦克风录音，适用于直接对话'
        }
      },
      errors: {
        apiConnectionFailed: 'API连接失败',
        apiKeyMissing: '未找到 API 密钥，请检查 .env.local 文件中的 VITE_GEMINI_API_KEY 配置',
        audioDeviceError: '音频设备错误',
        permissionsNotSet: '权限未设置',
        networkError: '网络错误',
        unknownError: '未知错误',
        permissionsHint: '请在设置中完成所有权限配置',
        connectFailed: '无法连接 AI 服务，请检查 API 密钥是否有效',
        reconnectFailed: '重连失败，请检查网络连接后重试',
        notConnected: '当前未连接到 AI 服务，请等待连接完成或点击重连。',
        sendFailed: '抱歉，发送消息失败：{{error}}',
        tryAgain: '请稍后重试',
        sendError: '发送消息时出现错误，请检查连接状态。',
        audioInterrupted: '音频流已中断，请点击重连按钮恢复连接',
        audioSwitchFailed: '切换到{{mode}}失败，请检查设备设置',
        audioSwitchError: '音频模式切换出错，请重试',
        audioStartFailed: '无法启动音频捕获，请检查系统音频权限'
      },
      empty: {
        system: '面宝会回复面试官提问',
        microphone: '面宝会回复麦克风说话',
        helper: '打字输入也可以哦'
      },
      labels: {
        transcribing: '转录中...',
        input: '输入',
        thinking: '思考中...',
        responding: '回复中...',
        bready: '面宝'
      },
      input: {
        placeholder: '输入您的问题...',
        helper: '按 Enter 发送 · Shift+Enter 换行'
      },
      sidebar: {
        title: '对话',
        empty: '暂无对话'
      },
      aiThinking: '面宝正在思考回答...',
      previewReply: '收到您的问题：“{{message}}”，我正在思考如何回答...（浏览器预览模式）',
      exit: {
        title: '退出协作模式？',
        description: '这将断开与AI的连接并返回主页。',
        confirm: '退出'
      },
      permissions: {
        title: '权限设置',
        systemAudio: '系统音频权限',
        systemAudioDesc: '用于捕获系统播放的音频（如在线面试官的声音）',
        microphone: '麦克风权限',
        microphoneDesc: '用于语音输入（可选）',
        network: '网络连接',
        granted: '已授予',
        needsSetup: '需要设置',
        denied: '被拒绝',
        networkConnected: '已连接',
        networkDisconnected: '未连接',
        networkConnectedDesc: '与 Gemini API 保持连接',
        networkDisconnectedDesc: '尝试重新连接 AI 服务',
        reconnect: '重新连接'
      },
      toasts: {
        connectionFailed: '连接 AI 服务失败，已返回主页',
        deviceSwitched: '麦克风已切换至: {{device}}'
      },
      actions: {
        copy: '复制内容',
        reconnect: '重连'
      }
    },
    admin: {
      title: '管理后台',
      tabs: {
        users: '用户管理',
        usage: '使用记录'
      },
      stats: {
        totalUsers: '用户总数',
        activeMembers: '有效会员',
        remainingMinutes: '剩余时长',
        expiringSoon: '即将到期'
      },
      search: '搜索用户姓名或邮箱',
      empty: '暂无用户数据',
      loading: '加载中...',
      currentUser: '当前用户',
      registered: '注册',
      remaining: '剩余',
      membership: '会员',
      role: '角色',
      changeRole: '修改角色',
      roleUpdated: '更新用户角色失败',
      noUsage: '使用记录功能开发中...',
      usageTitle: '使用概览',
      totalMinutes: '累计购买时长',
      avgMinutes: '人均剩余时长',
      usageHint: '近 30 天趋势（占位）',
      actions: {
        previous: '上一页',
        next: '下一页'
      }
    },
    profile: {
      title: '个人中心',
      identity: '身份等级',
      membership: '会员信息',
      remainingTime: '剩余面试时间',
      expiry: '会员到期时间',
      expired: '已过期',
      totalPurchased: '累计购买时间',
      usageProgress: '使用进度',
      packages: '购买套餐',
      minutes: '{{count}} 分钟',
      discount: '{{percent}}%折扣',
      buy: '购买',
      admin: '管理后台',
      logout: '退出登录',
      settings: '个性化设置',
      theme: '主题',
      language: '语言',
      themeOptions: {
        light: '浅色',
        dark: '深色',
        auto: '跟随系统'
      },
      tabs: {
        profile: '个人信息',
        membership: '会员中心',
        history: '历史记录',
        settings: '设置'
      },
      editor: {
        title: '编辑资料',
        nickname: '昵称',
        nicknamePlaceholder: '请输入昵称',
        notSet: '未设置',
        email: '邮箱',
        createdAt: '注册时间'
      },
      avatar: {
        title: '选择头像',
        label: '头像',
        change: '更换',
        hint: '点击选择头像'
      },
      security: {
        title: '账户安全',
        changePassword: '修改密码',
        currentPassword: '当前密码',
        newPassword: '新密码',
        confirmPassword: '确认新密码',
        passwordMismatch: '两次输入的密码不一致',
        passwordTooShort: '密码长度至少6位',
        passwordChanged: '密码修改成功',
        passwordChangeFailed: '密码修改失败',
        bindPhone: '绑定手机',
        phonePlaceholder: '请输入手机号',
        codePlaceholder: '验证码',
        sendCode: '发送验证码',
        codeSent: '验证码已发送',
        invalidPhone: '请输入有效的手机号',
        invalidCode: '请输入6位验证码',
        phoneBound: '手机绑定成功',
        phoneBindFailed: '手机绑定失败',
        bindEmail: '绑定邮箱',
        emailPlaceholder: '请输入邮箱地址',
        invalidEmail: '请输入有效的邮箱地址',
        emailBound: '邮箱绑定成功',
        emailBindFailed: '邮箱绑定失败'
      },
      history: {
        usage: '使用记录',
        purchase: '购买记录',
        collaboration: '协作模式',
        liveInterview: '实时面试',
        consumed: '已消耗',
        noUsage: '暂无使用记录',
        noPurchase: '暂无购买记录',
        loadMore: '加载更多',
        expiresAt: '有效期至',
        saved: '节省',
        status: {
          completed: '已完成',
          pending: '处理中',
          cancelled: '已取消'
        }
      }
    },
    login: {
      title: '面宝 Bready',
      subtitleLogin: '登录您的账户',
      subtitleSignup: '创建新账户',
      nickname: '昵称',
      email: '邮箱',
      password: '密码',
      signup: '注册',
      login: '登录',
      phone: '手机号',
      sendCode: '发送验证码',
      code: '验证码',
      verify: '验证登录',
      resend: '重新发送验证码',
      google: '使用 Google 登录',
      adminTest: '管理员测试登录',
      switchEmail: '邮箱',
      switchPhone: '手机',
      hasAccount: '已有账户？',
      noAccount: '没有账户？',
      loginNow: '立即登录',
      signupNow: '立即注册',
      placeholders: {
        nickname: '请输入您的昵称',
        email: '请输入邮箱地址',
        password: '请输入密码',
        phone: '请输入手机号',
        code: '请输入6位验证码'
      },
      errors: {
        loginFailed: '登录失败',
        signupFailed: '注册失败',
        googleFailed: 'Google 登录失败',
        sendCodeFailed: '发送验证码失败',
        verifyFailed: '验证码验证失败',
        testLoginFailed: '测试登录失败',
        signupSuccess: '注册成功！正在为您登录...'
      }
    },
    prep: {
      notFoundTitle: '准备项未找到',
      notFoundDescription: '抱歉，未找到您请求的准备项。',
      backHome: '返回主页',
      updatedAt: '更新 {{date}}',
      actions: {
        edit: '编辑',
        startAnalysis: '开始分析'
      },
      sections: {
        match: '岗位匹配度',
        jobDescription: '岗位描述',
        resume: '个人简历',
        strengths: '核心优势',
        weaknesses: '改进空间',
        suggestions: '面试建议'
      },
      resumeMissing: '未上传简历',
      resumeAdd: '去添加',
      noAnalysisTitle: '暂无 AI 分析',
      report: {
        title: '面试准备分析报告',
        modalTitle: 'AI 分析报告',
        baseInfo: '基本信息',
        prepName: '准备名称',
        createdAt: '创建时间',
        updatedAt: '更新时间',
        analysisTitle: 'AI 分析结果',
        matchScore: '匹配度评分',
        fullScore: '满分 {{count}} 分',
        strengths: '优势分析',
        weaknesses: '需要改进',
        suggestions: '面试建议',
        fileName: '面试准备_{{name}}_分析报告.md',
        exportSuccess: '报告导出成功',
        exportFailed: '报告导出失败',
        completeInfo: '完善信息后获取 AI 报告'
      },
      shareTitle: '面试准备: {{name}}',
      shareText: '查看我的面试准备分析: {{name}}',
      shareCopied: '链接已复制到剪贴板',
      shareFailed: '分享失败'
    },
    prepList: {
      title: '我的准备项',
      count: '共 {{count}} 个准备项',
      empty: '暂无准备项',
      analyzing: '分析中'
    },
    prepEditor: {
      titleCreate: '创建面试准备',
      titleEdit: '编辑准备项',
      subtitleCreate: '为您的面试做好充分准备',
      subtitleEdit: '修改您的面试准备信息',
      name: {
        title: '准备名称',
        description: '公司-岗位，如字节跳动-销售',
        placeholder: '公司-岗位，如字节跳动-销售'
      },
      job: {
        title: '岗位信息 (JD)',
        description: '请粘贴完整的岗位描述，包括职责要求、技能要求等',
        label: '岗位描述',
        placeholder: '请在此处粘贴岗位描述...'
      },
      resume: {
        title: '个人简历 (可选)',
        description: '上传或粘贴您的简历内容',
        upload: {
          title: '点击上传简历文件',
          hint: '支持 .pdf, .doc, .docx, .txt',
          choose: '选择文件',
          uploaded: '已上传: {{name}}'
        },
        pasteLabel: '或直接粘贴简历内容',
        pastePlaceholder: '直接粘贴简历内容或其他相关信息...',
        extracting: '正在提取文件内容...'
      },
      analysis: {
        title: 'AI 分析',
        description: '基于您的信息进行智能分析',
        matchScore: '匹配度评分',
        strengths: '优势',
        suggestions: '改进建议',
        empty: '点击下方按钮进行 AI 分析'
      },
      actions: {
        save: '保存',
        saving: '保存中...',
        analyze: 'AI分析',
        analyzing: '分析中...',
        reanalyze: '重新分析'
      },
      toasts: {
        uploadSuccess: '文件上传成功',
        uploadFailed: '文件读取失败',
        extractSuccess: '文件内容提取成功',
        extractFailed: '文件内容提取失败',
        requiredFields: '请填写准备名称和岗位信息',
        updateSuccess: '更新成功',
        createSuccess: '创建成功',
        saveFailed: '保存失败，请稍后重试',
        analyzeFailed: 'AI 分析失败: {{error}}',
        analyzeSuccess: 'AI 分析完成',
        analyzeError: 'AI 分析过程中出现错误，请稍后重试'
      },
      mockAnalysis: {
        strengths: [
          '技术栈匹配度高，React和TypeScript经验符合岗位要求',
          '3年工作经验满足岗位基本要求',
          '具备移动端和PC端开发经验，技能面较广'
        ],
        weaknesses: [
          '缺少大型项目架构设计经验',
          '团队协作和项目管理经验描述不够详细',
          '对新技术的学习和应用能力需要进一步体现'
        ],
        suggestions: [
          '准备具体的项目案例，重点描述技术难点和解决方案',
          '强调团队协作经验，如代码review、技术分享等',
          '展示对前端工程化工具的深度理解和实践经验',
          '准备关于性能优化、用户体验提升的具体案例'
        ]
      }
    },
    errorBoundary: {
      title: '出现了一些问题',
      description: '应用遇到了意外错误，请尝试刷新页面或重启应用。',
      reload: '刷新页面',
      retry: '重试',
      details: '查看错误详情',
      copy: '复制报错',
      copied: '已复制',
      labels: {
        error: '错误',
        stack: '堆栈',
        componentStack: '组件堆栈'
      }
    },
    floating: {
      status: {
        idle: '准备中...',
        connecting: '正在连接 Gemini API...',
        connected: '已连接，正在启动音频捕获...',
        ready: '准备就绪',
        audioFailed: '错误：无法启动音频捕获。请检查系统音频权限',
        connectFailed: '错误：无法连接 Gemini API。请检查API密钥是否有效',
        apiKeyMissing: '错误：未找到 API 密钥。请检查 .env.local 文件中的 VITE_GEMINI_API_KEY 配置',
        reconnecting: '正在重连...',
        reconnectSuccess: '重连成功',
        reconnectFailed: '重连失败',
        sessionClosed: '会话已关闭',
        disconnected: '已断开连接',
        error: '错误：{{error}}',
        reconnectError: '重连错误：{{error}}',
        disconnectError: '断开连接错误：{{error}}'
      },
      labels: {
        liveTranscription: '实时转录',
        listening: '正在聆听...',
        waitingAudio: '等待音频输入',
        listeningHintTitle: 'AI 正在聆听',
        listeningHint: '开始说话，AI 将为您提供实时回复',
        waitingConnection: '等待连接...',
        initializingHint: '请稍候，正在初始化 AI 助手',
        aiAssistant: 'AI 助手',
        you: '您',
        responding: '正在回复...',
        inputPlaceholder: '输入问题...',
        systemAudio: '系统音频',
        clearHistory: '清除',
        clearHistoryTitle: '清除对话历史',
        opacity: '透明度',
        reconnect: '重连'
      }
    },
    monitoring: {
      title: '系统监控面板',
      close: '关闭',
      loading: '加载监控数据中...',
      systemStatus: '系统状态',
      monitoringSystem: '监控系统',
      running: '运行中',
      stopped: '已停止',
      metricsTotal: '性能指标 (总计: {{count}})',
      errorsTotal: '错误统计 (总计: {{count}})',
      noErrors: '暂无错误记录',
      actionsTotal: '用户行为 (总计: {{count}})',
      noActions: '暂无行为记录',
      hint: '按 Ctrl+Shift+M 可随时打开/关闭监控面板'
    },
    permissionsSetup: {
      title: 'Live Interview 权限设置',
      description: '为了确保 Live Interview 模式正常工作，需要配置以下权限和设置',
      checking: '检查权限状态...',
      screen: {
        title: '屏幕录制权限',
        description: '用于捕获系统音频',
        openSettings: '打开系统偏好设置'
      },
      microphone: {
        title: '麦克风权限',
        description: '用于语音输入（可选）',
        request: '请求权限',
        openSettings: '打开系统偏好设置'
      },
      apiKey: {
        title: 'Gemini API 密钥',
        description: '用于 AI 功能',
        hint: '请在 .env.local 文件中配置 VITE_GEMINI_API_KEY'
      },
      audio: {
        title: '音频设备',
        description: '系统音频捕获功能',
        test: '测试音频捕获',
        setup: '去设置'
      },
      testFailed: '测试失败',
      status: {
        granted: '已授予',
        needsSetup: '需要设置',
        denied: '被拒绝'
      },
      error: {
        unableCheck: '无法检查权限状态'
      },
      actions: {
        skip: '跳过设置',
        recheck: '重新检查',
        start: '开始 Live Interview',
        complete: '完成权限设置'
      },
      metrics: {
        capturedData: '捕获数据: {{bytes}} 字节',
        silence: '静音: {{percent}}%',
        recommendation: '建议: {{text}}'
      }
    },
    permissionsGuide: {
      title: '系统权限设置',
      description: '为了使用协作模式，Bready 需要以下系统权限：',
      screen: '屏幕录制权限',
      screenDesc: '用于捕获系统音频（在线面试官的声音）',
      mic: '麦克风权限',
      micDesc: '用于语音输入（可选）',
      later: '稍后设置',
      note: '你可以随时在协作模式中重新设置权限'
    },
    alerts: {
      deletePreparation: '确定要删除这个准备项吗？此操作无法撤销。',
      deleteFailed: '删除失败，请稍后重试',
      startCollabFailed: '无法启动协作模式，请检查应用权限',
      onlyAdmin: '只有管理员可以修改用户角色',
      updateRoleFailed: '更新用户角色失败',
      loadUsersFailed: '加载用户列表失败',
      purchaseFailed: '购买失败，请稍后重试',
      signOutFailed: '退出登录失败'
    }
  },
  'en-US': {
    app: {
      name: 'Bready',
      fullName: 'Bready',
      tagline: 'Landing Offers, Made Effortless',
      subtagline: 'AI-assisted interviews, steady and confident'
    },
    common: {
      loading: 'Loading...',
      loadingShort: 'Loading...',
      cancel: 'Cancel',
      close: 'Close',
      back: 'Back',
      delete: 'Delete',
      save: 'Save',
      confirm: 'Confirm',
      exit: 'Exit',
      start: 'Start',
      settings: 'Settings',
      later: 'Maybe later',
      currentUser: 'Current user',
      none: 'None',
      minutes: '{{count}} min'
    },
    form: {
      validation: {
        required: 'This field is required',
        requiredHint: 'Please enter a value',
        tooLong: 'Must be at most {{max}} characters',
        count: 'Current: {{count}} characters',
        counter: '{{count}}/{{max}} characters'
      },
      autosave: {
        saving: 'Saving...',
        savedAt: 'Draft saved at {{time}}',
        editing: 'Editing...'
      }
    },
    home: {
      headline: 'Landing Offers, Made Effortless',
      subhead: 'AI collaboration, stay in rhythm',
      start: 'Start',
      myPreparations: 'My Preparations',
      emptyTitle: 'Start your first interview prep',
      emptyDescription: 'Create a prep item, add your resume or job description, and let AI analyze and simulate interviews.',
      createNow: 'Create now',
      viewAll: 'View all {{count}}',
      analyzing: 'Analyzing'
    },
    slogans: {
      main: [
        'Nervous about interviews? Relax.',
        'Bready beside you, confidence on.',
        'Interviews? You got this.'
      ]
    },
    select: {
      title: 'Interview Setup',
      language: 'Language',
      purpose: 'Purpose',
      empty: 'No preparations yet',
      confirm: 'Confirm',
      quickStart: 'Skip and start now'
    },
    purposes: {
      interview: 'Interview',
      sales: 'Sales',
      meeting: 'Meeting'
    },
    createPrep: {
      title: 'Select Preparation Type',
      subtitle: 'Choose the type of preparation you want to create',
      types: {
        interview: {
          title: 'Interview',
          description: 'Prepare for job interviews, analyze role fit'
        },
        sales: {
          title: 'Sales',
          description: 'Prepare for client visits, plan sales strategy'
        },
        meeting: {
          title: 'Meeting',
          description: 'Prepare for important meetings, organize agenda'
        }
      }
    },
    salesPrep: {
      titleCreate: 'Create Sales Preparation',
      titleEdit: 'Edit Sales Preparation',
      name: {
        title: 'Preparation Name',
        placeholder: 'e.g., ABC Company Sales Visit'
      },
      clientInfo: {
        title: 'Client Information',
        placeholder: 'Enter client company name, industry, size, main business, decision makers...'
      },
      productInfo: {
        title: 'Product/Service Information',
        placeholder: 'Enter product or service details, key selling points, pricing strategy...'
      },
      salesGoal: {
        title: 'Sales Goal',
        placeholder: 'Enter sales objectives, expected outcomes, key milestones...'
      }
    },
    meetingPrep: {
      titleCreate: 'Create Meeting Preparation',
      titleEdit: 'Edit Meeting Preparation',
      name: {
        title: 'Preparation Name',
        placeholder: 'e.g., Q4 Summary Meeting'
      },
      meetingTopic: {
        title: 'Meeting Topic',
        placeholder: 'Enter meeting topic, background, objectives...'
      },
      participants: {
        title: 'Participants',
        placeholder: 'Enter participant list, positions, roles...'
      },
      agenda: {
        title: 'Meeting Agenda',
        placeholder: 'Enter agenda items, time allocation...'
      },
      keyPoints: {
        title: 'Key Points',
        placeholder: 'Enter key issues to discuss, decisions to make, expected outcomes...'
      }
    },
    languages: {
      'cmn-CN': '中文',
      'en-US': 'English',
      'ja-JP': '日本語',
      'fr-FR': 'Français'
    },
    welcome: {
      title: 'Bready',
      tagline: 'Interviews get tense. Stay calm.',
      features: {
        collaboration: {
          title: 'Smart Collaboration',
          items: ['Resume analysis', 'Live prompts']
        },
        audio: {
          title: 'Audio Tech',
          items: ['Low-latency response', 'Lossless audio handling']
        },
        privacy: {
          title: 'Privacy & Safety',
          items: ['Stealth mode', 'Local data only']
        }
      },
      cta: 'Get my interview ready',
      skip: 'Not now'
    },
    collaboration: {
      title: 'Collaboration Mode',
      copySuccess: 'Copied',
      status: {
        initializing: 'Initializing...',
        checkingPermissions: 'Checking permissions...',
        permissionsIncomplete: 'Permissions incomplete',
        permissionsFailed: 'Permission check failed',
        connecting: 'Connecting to AI...',
        apiKeyMissing: 'API key missing',
        audioStarting: 'Starting audio capture...',
        audioFailed: 'Audio capture failed',
        ready: 'Ready',
        waitingReady: 'Waiting for AI...',
        connectFailed: 'Connection failed',
        initFailed: 'Initialization failed',
        reconnecting: 'Reconnecting...',
        reconnectFailedRetry: 'Reconnect failed, try again',
        reconnectFailed: 'Reconnect failed',
        disconnected: 'Disconnected',
        preparing: 'Preparing collaboration mode...',
        switchingAudio: 'Switching audio mode...',
        switched: 'Switched to {{mode}}',
        switchFailed: 'Audio mode switch failed',
        browserPreview: 'Browser preview mode',
        browserSwitched: 'Switched to {{mode}} (preview)'
      },
      audioMode: {
        system: {
          label: 'System audio',
          description: 'Capture system audio for online interviews'
        },
        microphone: {
          label: 'Microphone',
          description: 'Record via mic for live conversations'
        }
      },
      errors: {
        apiConnectionFailed: 'API connection failed',
        apiKeyMissing: 'API key not found. Check VITE_GEMINI_API_KEY in .env.local.',
        audioDeviceError: 'Audio device error',
        permissionsNotSet: 'Permissions not set',
        networkError: 'Network error',
        unknownError: 'Unknown error',
        permissionsHint: 'Complete all permissions in settings',
        connectFailed: 'Unable to connect to AI. Check your API key.',
        reconnectFailed: 'Reconnect failed. Check your network and retry.',
        notConnected: 'AI not connected yet. Please wait or reconnect.',
        sendFailed: 'Sorry, failed to send message: {{error}}',
        tryAgain: 'Please try again later',
        sendError: 'Error sending message. Check your connection.',
        audioInterrupted: 'Audio stream interrupted. Click reconnect to restore.',
        audioSwitchFailed: 'Failed to switch to {{mode}}. Check device settings.',
        audioSwitchError: 'Audio switch error, please retry',
        audioStartFailed: 'Unable to start audio capture. Check system permissions.'
      },
      empty: {
        system: 'Bready answers the interviewer',
        microphone: 'Bready answers from mic input',
        helper: 'You can also type your input'
      },
      labels: {
        transcribing: 'Transcribing...',
        input: 'Input',
        thinking: 'Thinking...',
        responding: 'Responding...',
        bready: 'Bready'
      },
      input: {
        placeholder: 'Type your question...',
        helper: 'Press Enter to send · Shift+Enter for newline'
      },
      sidebar: {
        title: 'Conversation',
        empty: 'No messages yet'
      },
      aiThinking: 'Bready is thinking...',
      previewReply: 'Got your question: \"{{message}}\". Thinking... (preview mode)',
      exit: {
        title: 'Exit collaboration mode?',
        description: 'This will disconnect AI and return home.',
        confirm: 'Exit'
      },
      permissions: {
        title: 'Permissions',
        systemAudio: 'System audio permission',
        systemAudioDesc: 'Capture system audio (interviewer voice)',
        microphone: 'Microphone permission',
        microphoneDesc: 'Voice input (optional)',
        network: 'Network connection',
        granted: 'Granted',
        needsSetup: 'Needs setup',
        denied: 'Denied',
        networkConnected: 'Connected',
        networkDisconnected: 'Disconnected',
        networkConnectedDesc: 'Connected to Gemini API',
        networkDisconnectedDesc: 'Try reconnecting to AI service',
        reconnect: 'Reconnect'
      },
      toasts: {
        connectionFailed: 'AI connection failed, returned home',
        deviceSwitched: 'Microphone switched to: {{device}}'
      },
      actions: {
        copy: 'Copy',
        reconnect: 'Reconnect'
      }
    },
    admin: {
      title: 'Admin Console',
      tabs: {
        users: 'Users',
        usage: 'Usage'
      },
      stats: {
        totalUsers: 'Total users',
        activeMembers: 'Active members',
        remainingMinutes: 'Minutes left',
        expiringSoon: 'Expiring soon'
      },
      search: 'Search name or email',
      empty: 'No users yet',
      loading: 'Loading...',
      currentUser: 'Current user',
      registered: 'Joined',
      remaining: 'Remaining',
      membership: 'Membership',
      role: 'Role',
      changeRole: 'Change role',
      roleUpdated: 'Failed to update user role',
      noUsage: 'Usage dashboard coming soon...',
      usageTitle: 'Usage overview',
      totalMinutes: 'Total purchased minutes',
      avgMinutes: 'Avg remaining minutes',
      usageHint: '30-day trend (placeholder)',
      actions: {
        previous: 'Previous',
        next: 'Next'
      }
    },
    profile: {
      title: 'Profile',
      identity: 'Role',
      membership: 'Membership',
      remainingTime: 'Remaining interview time',
      expiry: 'Membership expiry',
      expired: 'Expired',
      totalPurchased: 'Total purchased time',
      usageProgress: 'Usage progress',
      packages: 'Packages',
      minutes: '{{count}} min',
      discount: '{{percent}}% off',
      buy: 'Buy',
      admin: 'Admin Console',
      logout: 'Sign out',
      settings: 'Preferences',
      theme: 'Theme',
      language: 'Language',
      themeOptions: {
        light: 'Light',
        dark: 'Dark',
        auto: 'System'
      },
      tabs: {
        profile: 'Profile',
        membership: 'Membership',
        history: 'History',
        settings: 'Settings'
      },
      editor: {
        title: 'Edit Profile',
        nickname: 'Nickname',
        nicknamePlaceholder: 'Enter nickname',
        notSet: 'Not set',
        email: 'Email',
        createdAt: 'Registered'
      },
      avatar: {
        title: 'Select Avatar',
        label: 'Avatar',
        change: 'Change',
        hint: 'Click to select'
      },
      security: {
        title: 'Account Security',
        changePassword: 'Change Password',
        currentPassword: 'Current password',
        newPassword: 'New password',
        confirmPassword: 'Confirm new password',
        passwordMismatch: 'Passwords do not match',
        passwordTooShort: 'Password must be at least 6 characters',
        passwordChanged: 'Password changed successfully',
        passwordChangeFailed: 'Failed to change password',
        bindPhone: 'Link Phone',
        phonePlaceholder: 'Enter phone number',
        codePlaceholder: 'Verification code',
        sendCode: 'Send code',
        codeSent: 'Verification code sent',
        invalidPhone: 'Please enter a valid phone number',
        invalidCode: 'Please enter 6-digit code',
        phoneBound: 'Phone linked successfully',
        phoneBindFailed: 'Failed to link phone',
        bindEmail: 'Link Email',
        emailPlaceholder: 'Enter email address',
        invalidEmail: 'Please enter a valid email',
        emailBound: 'Email linked successfully',
        emailBindFailed: 'Failed to link email'
      },
      history: {
        usage: 'Usage History',
        purchase: 'Purchase History',
        collaboration: 'Collaboration',
        liveInterview: 'Live Interview',
        consumed: 'Used',
        noUsage: 'No usage records',
        noPurchase: 'No purchase records',
        loadMore: 'Load more',
        expiresAt: 'Valid until',
        saved: 'Saved',
        status: {
          completed: 'Completed',
          pending: 'Pending',
          cancelled: 'Cancelled'
        }
      }
    },
    login: {
      title: 'Bready',
      subtitleLogin: 'Sign in to your account',
      subtitleSignup: 'Create a new account',
      nickname: 'Name',
      email: 'Email',
      password: 'Password',
      signup: 'Sign up',
      login: 'Sign in',
      phone: 'Phone',
      sendCode: 'Send code',
      code: 'Verification code',
      verify: 'Verify and sign in',
      resend: 'Resend code',
      google: 'Continue with Google',
      adminTest: 'Admin test login',
      switchEmail: 'Email',
      switchPhone: 'Phone',
      hasAccount: 'Already have an account?',
      noAccount: "Don't have an account?",
      loginNow: 'Sign in',
      signupNow: 'Sign up',
      placeholders: {
        nickname: 'Enter your name',
        email: 'Enter your email',
        password: 'Enter your password',
        phone: 'Enter your phone',
        code: 'Enter 6-digit code'
      },
      errors: {
        loginFailed: 'Login failed',
        signupFailed: 'Signup failed',
        googleFailed: 'Google sign-in failed',
        sendCodeFailed: 'Failed to send code',
        verifyFailed: 'Verification failed',
        testLoginFailed: 'Test login failed',
        signupSuccess: 'Signup successful! Logging you in...'
      }
    },
    prep: {
      notFoundTitle: 'Preparation not found',
      notFoundDescription: 'Sorry, the requested preparation could not be found.',
      backHome: 'Back to home',
      updatedAt: 'Updated {{date}}',
      actions: {
        edit: 'Edit',
        startAnalysis: 'Start analysis'
      },
      sections: {
        match: 'Role match',
        jobDescription: 'Job description',
        resume: 'Resume',
        strengths: 'Strengths',
        weaknesses: 'Areas to improve',
        suggestions: 'Interview tips'
      },
      resumeMissing: 'No resume uploaded',
      resumeAdd: 'Add one',
      noAnalysisTitle: 'No AI analysis yet',
      report: {
        title: 'Interview Prep Report',
        modalTitle: 'AI Analysis Report',
        baseInfo: 'Basic info',
        prepName: 'Preparation',
        createdAt: 'Created at',
        updatedAt: 'Updated at',
        analysisTitle: 'AI Analysis',
        matchScore: 'Match score',
        fullScore: 'Out of {{count}}',
        strengths: 'Strengths',
        weaknesses: 'Improvements',
        suggestions: 'Recommendations',
        fileName: 'Interview_Prep_{{name}}_Report.md',
        exportSuccess: 'Report exported successfully',
        exportFailed: 'Report export failed',
        completeInfo: 'Complete details to generate the AI report'
      },
      shareTitle: 'Interview prep: {{name}}',
      shareText: 'View my interview prep analysis: {{name}}',
      shareCopied: 'Link copied to clipboard',
      shareFailed: 'Share failed'
    },
    prepList: {
      title: 'All preparations',
      count: 'Total {{count}} preparations',
      empty: 'No preparations yet',
      analyzing: 'Analyzing'
    },
    prepEditor: {
      titleCreate: 'Create Interview Prep',
      titleEdit: 'Edit Preparation',
      subtitleCreate: 'Get your interview fully prepared',
      subtitleEdit: 'Update your prep details',
      name: {
        title: 'Preparation name',
        description: 'Company - Role, e.g., ByteDance - Sales',
        placeholder: 'Company - Role, e.g., ByteDance - Sales'
      },
      job: {
        title: 'Job details (JD)',
        description: 'Paste the full job description, responsibilities, and requirements',
        label: 'Job description',
        placeholder: 'Paste the job description here...'
      },
      resume: {
        title: 'Resume (optional)',
        description: 'Upload or paste your resume content',
        upload: {
          title: 'Click to upload resume file',
          hint: 'Supports .pdf, .doc, .docx, .txt, images',
          choose: 'Choose file',
          uploaded: 'Uploaded: {{name}}'
        },
        pasteLabel: 'Or paste resume content',
        pastePlaceholder: 'Paste resume content or related info...',
        extracting: 'Extracting file content...'
      },
      analysis: {
        title: 'AI Analysis',
        description: 'Smart analysis based on your input',
        matchScore: 'Match score',
        strengths: 'Strengths',
        suggestions: 'Improvements',
        empty: 'Click the button below to run AI analysis'
      },
      actions: {
        save: 'Save',
        saving: 'Saving...',
        analyze: 'Analyze with AI',
        analyzing: 'Analyzing...',
        reanalyze: 'Re-analyze'
      },
      toasts: {
        uploadSuccess: 'File uploaded successfully',
        uploadFailed: 'Failed to read file',
        extractSuccess: 'File content extracted successfully',
        extractFailed: 'Failed to extract file content',
        requiredFields: 'Please fill in preparation name and job description',
        updateSuccess: 'Updated successfully',
        createSuccess: 'Created successfully',
        saveFailed: 'Save failed. Please try again.',
        analyzeFailed: 'AI analysis failed: {{error}}',
        analyzeSuccess: 'AI analysis complete',
        analyzeError: 'AI analysis failed. Please try again later.'
      },
      mockAnalysis: {
        strengths: [
          'Strong tech stack match with React and TypeScript',
          '3 years of experience meets role requirements',
          'Experience across mobile and web development'
        ],
        weaknesses: [
          'Limited large-scale architecture experience',
          'Team collaboration details are light',
          'Need stronger evidence of learning new tech'
        ],
        suggestions: [
          'Prepare concrete project stories and technical tradeoffs',
          'Highlight collaboration: code reviews and sharing',
          'Show depth in frontend tooling and workflows',
          'Bring examples of performance and UX improvements'
        ]
      }
    },
    errorBoundary: {
      title: 'Something went wrong',
      description: 'The app hit an unexpected error. Try refreshing or restarting.',
      reload: 'Reload',
      retry: 'Try again',
      details: 'View error details',
      copy: 'Copy error',
      copied: 'Copied',
      labels: {
        error: 'Error',
        stack: 'Stack',
        componentStack: 'Component stack'
      }
    },
    floating: {
      status: {
        idle: 'Preparing...',
        connecting: 'Connecting to Gemini API...',
        connected: 'Connected, starting audio capture...',
        ready: 'Ready',
        audioFailed: 'Error: Unable to start audio capture. Check audio permissions.',
        connectFailed: 'Error: Unable to connect to Gemini API. Check API key.',
        apiKeyMissing: 'Error: API key not found. Check VITE_GEMINI_API_KEY in .env.local.',
        reconnecting: 'Reconnecting...',
        reconnectSuccess: 'Reconnected',
        reconnectFailed: 'Reconnect failed',
        sessionClosed: 'Session closed',
        disconnected: 'Disconnected',
        error: 'Error: {{error}}',
        reconnectError: 'Reconnect error: {{error}}',
        disconnectError: 'Disconnect error: {{error}}'
      },
      labels: {
        liveTranscription: 'Live transcription',
        listening: 'Listening...',
        waitingAudio: 'Waiting for audio input',
        listeningHintTitle: 'AI is listening',
        listeningHint: 'Start speaking and AI will respond in real time',
        waitingConnection: 'Waiting for connection...',
        initializingHint: 'Initializing AI assistant, please wait',
        aiAssistant: 'AI Assistant',
        you: 'You',
        responding: 'Responding...',
        inputPlaceholder: 'Type your question...',
        systemAudio: 'System audio',
        clearHistory: 'Clear',
        clearHistoryTitle: 'Clear conversation history',
        opacity: 'Opacity',
        reconnect: 'Reconnect'
      }
    },
    monitoring: {
      title: 'System Monitoring',
      close: 'Close',
      loading: 'Loading monitoring data...',
      systemStatus: 'System status',
      monitoringSystem: 'Monitoring',
      running: 'Running',
      stopped: 'Stopped',
      metricsTotal: 'Performance metrics (total: {{count}})',
      errorsTotal: 'Errors (total: {{count}})',
      noErrors: 'No errors recorded',
      actionsTotal: 'User actions (total: {{count}})',
      noActions: 'No actions recorded',
      hint: 'Press Ctrl+Shift+M to toggle the monitoring panel'
    },
    permissionsSetup: {
      title: 'Live Interview permissions',
      description: 'To ensure Live Interview works properly, configure the following permissions.',
      checking: 'Checking permissions...',
      screen: {
        title: 'Screen recording',
        description: 'Capture system audio',
        openSettings: 'Open system settings'
      },
      microphone: {
        title: 'Microphone',
        description: 'Voice input (optional)',
        request: 'Request permission',
        openSettings: 'Open system settings'
      },
      apiKey: {
        title: 'Gemini API key',
        description: 'For AI features',
        hint: 'Set VITE_GEMINI_API_KEY in .env.local'
      },
      audio: {
        title: 'Audio device',
        description: 'System audio capture',
        test: 'Test audio capture',
        setup: 'Open settings'
      },
      testFailed: 'Test failed',
      status: {
        granted: 'Granted',
        needsSetup: 'Needs setup',
        denied: 'Denied'
      },
      error: {
        unableCheck: 'Unable to check permission status'
      },
      actions: {
        skip: 'Skip setup',
        recheck: 'Recheck',
        start: 'Start Live Interview',
        complete: 'Complete setup'
      },
      metrics: {
        capturedData: 'Captured data: {{bytes}} bytes',
        silence: 'Silence: {{percent}}%',
        recommendation: 'Tip: {{text}}'
      }
    },
    permissionsGuide: {
      title: 'System permissions',
      description: 'To use collaboration mode, Bready needs these permissions:',
      screen: 'Screen recording',
      screenDesc: 'Capture system audio (interviewer voice)',
      mic: 'Microphone',
      micDesc: 'Voice input (optional)',
      later: 'Maybe later',
      note: 'You can revisit permissions in collaboration mode'
    },
    alerts: {
      deletePreparation: 'Delete this preparation? This cannot be undone.',
      deleteFailed: 'Delete failed. Please try again.',
      startCollabFailed: 'Unable to start collaboration. Check app permissions.',
      onlyAdmin: 'Only admins can change user roles',
      updateRoleFailed: 'Failed to update user role',
      loadUsersFailed: 'Failed to load user list',
      purchaseFailed: 'Purchase failed. Please try again.',
      signOutFailed: 'Sign out failed'
    }
  },
  'ja-JP': {
    app: {
      name: 'Bready',
      fullName: 'Bready',
      tagline: '内定獲得をもっと簡単に',
      subtagline: 'AIで面接をもっと落ち着いて'
    },
    common: {
      loading: '読み込み中...',
      loadingShort: '読み込み中...',
      cancel: 'キャンセル',
      close: '閉じる',
      back: '戻る',
      delete: '削除',
      save: '保存',
      confirm: '確認',
      exit: '退出',
      start: '開始',
      settings: '設定',
      later: 'あとで',
      currentUser: '現在のユーザー',
      none: 'なし',
      minutes: '{{count}}分'
    },
    form: {
      validation: {
        required: '必須項目です',
        requiredHint: '入力してください',
        tooLong: '{{max}}文字以内で入力してください',
        count: '現在 {{count}} 文字',
        counter: '{{count}}/{{max}} 文字'
      },
      autosave: {
        saving: '保存中...',
        savedAt: '下書きを {{time}} に保存しました',
        editing: '編集中...'
      }
    },
    home: {
      headline: '内定獲得をもっと簡単に',
      subhead: 'AI協作、リズムを保つ',
      start: '開始',
      myPreparations: '準備リスト',
      emptyTitle: '最初の準備を始めましょう',
      emptyDescription: '準備項目を作成し、履歴書や職務内容を追加してください。',
      createNow: '今すぐ作成',
      viewAll: 'すべて表示 {{count}}',
      analyzing: '分析中'
    },
    slogans: {
      main: [
        '面接が不安？落ち着いて。',
        'Breadyと一緒に自信を。',
        '面接？大丈夫。'
      ]
    },
    select: {
      title: '面接準備',
      language: '言語',
      purpose: '目的',
      empty: '準備がありません',
      confirm: '確定',
      quickStart: '準備なしで開始'
    },
    purposes: {
      interview: '面接',
      sales: '営業',
      meeting: '会議'
    },
    createPrep: {
      title: '準備タイプを選択',
      subtitle: '作成する準備のタイプを選択してください',
      types: {
        interview: {
          title: '面接',
          description: '就職面接の準備、職務適合度の分析'
        },
        sales: {
          title: '営業',
          description: '顧客訪問の準備、営業戦略の策定'
        },
        meeting: {
          title: '会議',
          description: '重要な会議の準備、議題の整理'
        }
      }
    },
    salesPrep: {
      titleCreate: '営業準備を作成',
      titleEdit: '営業準備を編集',
      name: {
        title: '準備名',
        placeholder: '例：XX社営業訪問'
      },
      clientInfo: {
        title: '顧客情報',
        placeholder: '顧客の会社名、業界、規模、主要事業、意思決定者情報などを入力...'
      },
      productInfo: {
        title: '製品/サービス情報',
        placeholder: '販売する製品やサービスの詳細、主要なセールスポイント、価格戦略などを入力...'
      },
      salesGoal: {
        title: '営業目標',
        placeholder: '今回の訪問の営業目標、期待される成果、主要なマイルストーンなどを入力...'
      }
    },
    meetingPrep: {
      titleCreate: '会議準備を作成',
      titleEdit: '会議準備を編集',
      name: {
        title: '準備名',
        placeholder: '例：Q4四半期総括会議'
      },
      meetingTopic: {
        title: '会議テーマ',
        placeholder: '会議のテーマ、背景、目的などを入力...'
      },
      participants: {
        title: '参加者',
        placeholder: '参加者リスト、役職、役割などを入力...'
      },
      agenda: {
        title: '会議議題',
        placeholder: '議題の配置、時間配分などを入力...'
      },
      keyPoints: {
        title: '重要ポイント',
        placeholder: '議論すべき重要な問題、決定事項、期待される成果などを入力...'
      }
    },
    languages: {
      'cmn-CN': '中文',
      'en-US': 'English',
      'ja-JP': '日本語',
      'fr-FR': 'Français'
    },
    welcome: {
      title: 'Bready',
      tagline: '面接が不安？落ち着いて。',
      features: {
        collaboration: {
          title: 'スマート協働',
          items: ['履歴書分析', 'リアルタイム提示']
        },
        audio: {
          title: '音声技術',
          items: ['低遅延', '高品質音声']
        },
        privacy: {
          title: 'プライバシー',
          items: ['ステルス', 'ローカル保存']
        }
      },
      cta: '面接準備を始める',
      skip: 'あとで'
    },
    collaboration: {
      title: '協作モード',
      copySuccess: 'コピーしました',
      status: {
        initializing: '初期化中...',
        checkingPermissions: '権限を確認中...',
        permissionsIncomplete: '権限が不足しています',
        permissionsFailed: '権限確認に失敗',
        connecting: 'AIに接続中...',
        apiKeyMissing: 'APIキー未設定',
        audioStarting: '音声を開始中...',
        audioFailed: '音声開始に失敗',
        ready: '準備完了',
        waitingReady: 'AI待機中...',
        connectFailed: '接続失敗',
        initFailed: '初期化失敗',
        reconnecting: '再接続中...',
        reconnectFailedRetry: '再接続失敗',
        reconnectFailed: '再接続失敗',
        disconnected: '切断されました',
        preparing: '協作モード準備中...',
        switchingAudio: '音声モード切替中...',
        switched: '{{mode}}に切替済み',
        switchFailed: '音声切替に失敗',
        browserPreview: 'ブラウザプレビュー',
        browserSwitched: '{{mode}}に切替（プレビュー）'
      },
      audioMode: {
        system: {
          label: 'システム音声',
          description: 'オンライン面接用のシステム音声'
        },
        microphone: {
          label: 'マイク',
          description: 'マイク入力で会話'
        }
      },
      errors: {
        apiConnectionFailed: 'API接続失敗',
        apiKeyMissing: 'APIキーが見つかりません',
        audioDeviceError: '音声デバイスエラー',
        permissionsNotSet: '権限未設定',
        networkError: 'ネットワークエラー',
        unknownError: '不明なエラー',
        permissionsHint: '設定で権限を完了してください',
        connectFailed: 'AIに接続できません',
        reconnectFailed: '再接続に失敗しました',
        notConnected: 'AIに未接続です',
        sendFailed: '送信失敗：{{error}}',
        tryAgain: 'しばらくして再試行',
        sendError: '送信エラー',
        audioInterrupted: '音声が中断されました',
        audioSwitchFailed: '{{mode}}への切替に失敗しました',
        audioSwitchError: '音声切替エラー',
        audioStartFailed: '音声キャプチャを開始できません'
      },
      empty: {
        system: '面接官の質問に答えます',
        microphone: 'マイク入力に答えます',
        helper: 'テキスト入力も可能です'
      },
      labels: {
        transcribing: '文字起こし中...',
        input: '入力',
        thinking: '考え中...',
        responding: '返信中...',
        bready: 'Bready'
      },
      input: {
        placeholder: '質問を入力...',
        helper: 'Enterで送信・Shift+Enterで改行'
      },
      sidebar: {
        title: '会話',
        empty: '会話がありません'
      },
      aiThinking: 'Breadyが考え中...',
      previewReply: '質問受信：「{{message}}」（プレビュー）',
      exit: {
        title: '協作モードを終了しますか？',
        description: 'AI接続を切断してホームに戻ります。',
        confirm: '退出'
      },
      permissions: {
        title: '権限設定',
        systemAudio: 'システム音声権限',
        systemAudioDesc: 'システム音声を取得します',
        microphone: 'マイク権限',
        microphoneDesc: '音声入力',
        network: 'ネットワーク',
        granted: '許可済み',
        needsSetup: '設定が必要',
        denied: '拒否されました',
        networkConnected: '接続済み',
        networkDisconnected: '未接続',
        networkConnectedDesc: 'Gemini APIに接続中',
        networkDisconnectedDesc: '再接続してください',
        reconnect: '再接続'
      },
      toasts: {
        connectionFailed: 'AI接続に失敗しました'
      },
      actions: {
        copy: 'コピー',
        reconnect: '再接続'
      }
    },
    admin: {
      title: '管理コンソール',
      tabs: {
        users: 'ユーザー',
        usage: '使用状況'
      },
      stats: {
        totalUsers: 'ユーザー数',
        activeMembers: '有効会員',
        remainingMinutes: '残り時間',
        expiringSoon: '期限切れ間近'
      },
      search: '名前やメールで検索',
      empty: 'ユーザーがいません',
      loading: '読み込み中...',
      currentUser: '現在のユーザー',
      registered: '登録日',
      remaining: '残り',
      membership: '会員',
      role: '役割',
      changeRole: '役割変更',
      roleUpdated: '役割更新に失敗',
      noUsage: '使用状況は準備中',
      usageTitle: '使用概況',
      totalMinutes: '購入時間合計',
      avgMinutes: '平均残り時間',
      usageHint: '30日トレンド（仮）',
      actions: {
        previous: '前へ',
        next: '次へ'
      }
    },
    profile: {
      title: 'プロフィール',
      identity: '役割',
      membership: '会員情報',
      remainingTime: '残り面接時間',
      expiry: '有効期限',
      totalPurchased: '購入合計',
      packages: 'プラン購入',
      minutes: '{{count}}分',
      discount: '{{percent}}%割引',
      buy: '購入',
      admin: '管理コンソール',
      logout: 'ログアウト',
      settings: '設定',
      theme: 'テーマ',
      language: '言語',
      themeOptions: {
        light: 'ライト',
        dark: 'ダーク',
        auto: 'システム'
      },
      security: {
        title: 'アカウントセキュリティ',
        changePassword: 'パスワード変更',
        currentPassword: '現在のパスワード',
        newPassword: '新しいパスワード',
        confirmPassword: '新しいパスワードの確認',
        passwordMismatch: 'パスワードが一致しません',
        passwordTooShort: 'パスワードは6文字以上',
        passwordChanged: 'パスワードを変更しました',
        passwordChangeFailed: 'パスワード変更に失敗しました',
        bindPhone: '電話番号を連携',
        phonePlaceholder: '電話番号を入力',
        codePlaceholder: '確認コード',
        sendCode: 'コード送信',
        codeSent: 'コードを送信しました',
        invalidPhone: '有効な電話番号を入力してください',
        invalidCode: '6桁のコードを入力してください',
        phoneBound: '電話番号を連携しました',
        phoneBindFailed: '電話番号の連携に失敗しました',
        bindEmail: 'メールを連携',
        emailPlaceholder: 'メールアドレスを入力',
        invalidEmail: '有効なメールアドレスを入力してください',
        emailBound: 'メールを連携しました',
        emailBindFailed: 'メールの連携に失敗しました'
      }
    },
    login: {
      title: 'Bready',
      subtitleLogin: 'ログイン',
      subtitleSignup: '新規登録',
      nickname: '名前',
      email: 'メール',
      password: 'パスワード',
      signup: '登録',
      login: 'ログイン',
      phone: '電話番号',
      sendCode: 'コード送信',
      code: '確認コード',
      verify: '確認してログイン',
      resend: '再送信',
      google: 'Googleで続行',
      adminTest: '管理者テストログイン',
      switchEmail: 'メール',
      switchPhone: '電話',
      hasAccount: 'アカウントをお持ちですか？',
      noAccount: 'アカウントがありませんか？',
      loginNow: 'ログイン',
      signupNow: '登録',
      placeholders: {
        nickname: '名前を入力',
        email: 'メールを入力',
        password: 'パスワードを入力',
        phone: '電話番号を入力',
        code: '6桁コードを入力'
      },
      errors: {
        loginFailed: 'ログイン失敗',
        signupFailed: '登録失敗',
        googleFailed: 'Googleログイン失敗',
        sendCodeFailed: 'コード送信失敗',
        verifyFailed: '確認失敗',
        testLoginFailed: 'テストログイン失敗',
        signupSuccess: '登録成功、ログイン中...'
      }
    },
    prep: {
      notFoundTitle: '準備が見つかりません',
      notFoundDescription: '指定の準備が見つかりませんでした。',
      backHome: 'ホームへ戻る',
      updatedAt: '更新 {{date}}',
      actions: {
        edit: '編集',
        startAnalysis: '分析を開始'
      },
      sections: {
        match: '職務一致度',
        jobDescription: '職務内容',
        resume: '履歴書',
        strengths: '強み',
        weaknesses: '改善点',
        suggestions: '面接アドバイス'
      },
      resumeMissing: '履歴書未アップロード',
      resumeAdd: '追加する',
      noAnalysisTitle: 'AI分析なし',
      report: {
        title: '面接準備レポート',
        modalTitle: 'AI 分析レポート',
        baseInfo: '基本情報',
        prepName: '準備名称',
        createdAt: '作成日',
        updatedAt: '更新日',
        analysisTitle: 'AI分析結果',
        matchScore: '一致度スコア',
        fullScore: '{{count}} 点満点',
        strengths: '強み',
        weaknesses: '改善点',
        suggestions: '面接アドバイス',
        fileName: 'Interview_Prep_{{name}}_Report.md',
        exportSuccess: 'レポートをエクスポートしました',
        exportFailed: 'レポートのエクスポートに失敗しました',
        completeInfo: '情報を入力してAIレポートを取得'
      },
      shareTitle: '面接準備: {{name}}',
      shareText: '面接準備の分析を共有: {{name}}',
      shareCopied: 'リンクをコピーしました',
      shareFailed: '共有に失敗しました'
    },
    prepList: {
      title: '準備一覧',
      count: '合計 {{count}} 件',
      empty: '準備がありません',
      analyzing: '分析中'
    },
    prepEditor: {
      titleCreate: '面接準備を作成',
      titleEdit: '準備を編集',
      subtitleCreate: '面接に向けて準備しましょう',
      subtitleEdit: '準備内容を更新します',
      name: {
        title: '準備名称',
        description: '会社-職種（例: ByteDance-営業）',
        placeholder: '会社-職種（例: ByteDance-営業）'
      },
      job: {
        title: '職務内容 (JD)',
        description: '職務内容を貼り付けてください',
        label: '職務内容',
        placeholder: '職務内容を貼り付けてください...'
      },
      resume: {
        title: '履歴書 (任意)',
        description: '履歴書をアップロードまたは貼り付け',
        upload: {
          title: '履歴書ファイルをアップロード',
          hint: '対応 .pdf, .doc, .docx, .txt',
          choose: 'ファイル選択',
          uploaded: 'アップロード済み: {{name}}'
        },
        pasteLabel: 'または履歴書を貼り付け',
        pastePlaceholder: '履歴書内容を貼り付け...'
      },
      analysis: {
        title: 'AI 分析',
        description: '入力内容に基づく分析',
        matchScore: '一致度スコア',
        strengths: '強み',
        suggestions: '改善提案',
        empty: '下のボタンで AI 分析を実行'
      },
      actions: {
        save: '保存',
        saving: '保存中...',
        analyze: 'AI分析',
        analyzing: '分析中...',
        reanalyze: '再分析'
      },
      toasts: {
        uploadSuccess: 'ファイルをアップロードしました',
        uploadFailed: 'ファイル読み込みに失敗しました',
        requiredFields: '準備名称と職務内容を入力してください',
        updateSuccess: '更新しました',
        createSuccess: '作成しました',
        saveFailed: '保存に失敗しました。再試行してください。',
        analyzeFailed: 'AI 分析失敗: {{error}}',
        analyzeSuccess: 'AI 分析完了',
        analyzeError: 'AI 分析中にエラーが発生しました'
      },
      mockAnalysis: {
        strengths: [
          'React と TypeScript の経験が要件と一致',
          '3 年の経験が基本要件を満たす',
          'モバイルと Web の開発経験がある'
        ],
        weaknesses: [
          '大規模アーキテクチャ経験が不足',
          '協業・管理の説明が少ない',
          '新技術の学習・適用の裏付けが必要'
        ],
        suggestions: [
          '技術的な意思決定の事例を準備する',
          'コードレビューや共有など協業経験を強調',
          'フロントエンドツールの深い理解を示す',
          '性能改善・UX向上の具体例を用意する'
        ]
      }
    },
    errorBoundary: {
      title: '問題が発生しました',
      description: '予期しないエラーが発生しました。再読み込みまたは再起動してください。',
      reload: '再読み込み',
      retry: '再試行',
      details: 'エラー詳細を見る',
      copy: 'エラーをコピー',
      copied: 'コピーしました',
      labels: {
        error: 'エラー',
        stack: 'スタック',
        componentStack: 'コンポーネントスタック'
      }
    },
    floating: {
      status: {
        idle: '準備中...',
        connecting: 'Gemini API に接続中...',
        connected: '接続済み、音声を開始中...',
        ready: '準備完了',
        audioFailed: 'エラー: 音声キャプチャを開始できません',
        connectFailed: 'エラー: Gemini API に接続できません',
        apiKeyMissing: 'エラー: APIキーが見つかりません',
        reconnecting: '再接続中...',
        reconnectSuccess: '再接続成功',
        reconnectFailed: '再接続失敗',
        sessionClosed: 'セッションが終了しました',
        disconnected: '切断されました',
        error: 'エラー：{{error}}',
        reconnectError: '再接続エラー：{{error}}',
        disconnectError: '切断エラー：{{error}}'
      },
      labels: {
        liveTranscription: 'リアルタイム文字起こし',
        listening: '聞き取り中...',
        waitingAudio: '音声入力待ち',
        listeningHintTitle: 'AI が聞き取り中',
        listeningHint: '話し始めると AI が返信します',
        waitingConnection: '接続待ち...',
        initializingHint: 'AI アシスタントを初期化中',
        aiAssistant: 'AI アシスタント',
        you: 'あなた',
        responding: '返信中...',
        inputPlaceholder: '質問を入力...',
        systemAudio: 'システム音声',
        clearHistory: 'クリア',
        clearHistoryTitle: '会話履歴をクリア',
        opacity: '不透明度',
        reconnect: '再接続'
      }
    },
    monitoring: {
      title: 'システム監視',
      close: '閉じる',
      loading: '監視データを読み込み中...',
      systemStatus: 'システム状態',
      monitoringSystem: '監視システム',
      running: '稼働中',
      stopped: '停止中',
      metricsTotal: '性能指標 (合計: {{count}})',
      errorsTotal: 'エラー統計 (合計: {{count}})',
      noErrors: 'エラー記録はありません',
      actionsTotal: 'ユーザー行動 (合計: {{count}})',
      noActions: '記録はありません',
      hint: 'Ctrl+Shift+M で監視パネルを切替'
    },
    permissionsSetup: {
      title: 'Live Interview 権限設定',
      description: 'Live Interview を使用するために必要な権限を設定します。',
      checking: '権限を確認中...',
      screen: {
        title: '画面収録権限',
        description: 'システム音声を取得',
        openSettings: 'システム設定を開く'
      },
      microphone: {
        title: 'マイク権限',
        description: '音声入力（任意）',
        request: '権限を要求',
        openSettings: 'システム設定を開く'
      },
      apiKey: {
        title: 'Gemini API キー',
        description: 'AI 機能に必要',
        hint: '.env.local に VITE_GEMINI_API_KEY を設定'
      },
      audio: {
        title: '音声デバイス',
        description: 'システム音声キャプチャ',
        test: '音声キャプチャをテスト',
        setup: '設定へ'
      },
      testFailed: 'テストに失敗しました',
      status: {
        granted: '許可済み',
        needsSetup: '設定が必要',
        denied: '拒否されました'
      },
      error: {
        unableCheck: '権限状態を確認できません'
      },
      actions: {
        skip: 'スキップ',
        recheck: '再チェック',
        start: 'Live Interview を開始',
        complete: '権限設定を完了'
      },
      metrics: {
        capturedData: 'キャプチャデータ: {{bytes}} バイト',
        silence: '無音: {{percent}}%',
        recommendation: '提案: {{text}}'
      }
    },
    permissionsGuide: {
      title: 'システム権限',
      description: '協作モードには権限が必要です',
      screen: '画面収録',
      screenDesc: 'システム音声を取得',
      mic: 'マイク',
      micDesc: '音声入力',
      later: 'あとで',
      note: '協作モードで再設定できます'
    },
    alerts: {
      deletePreparation: '準備を削除しますか？',
      deleteFailed: '削除に失敗しました',
      startCollabFailed: '協作モードを開始できません',
      onlyAdmin: '管理者のみ変更可能です',
      updateRoleFailed: '役割更新に失敗しました',
      loadUsersFailed: 'ユーザー一覧の取得に失敗しました',
      purchaseFailed: '購入に失敗しました',
      signOutFailed: 'ログアウトに失敗しました'
    }
  },
  'fr-FR': {
    app: {
      name: 'Bready',
      fullName: 'Bready',
      tagline: "Décrochez l'offre plus simplement",
      subtagline: "Entretien assisté par l'IA, en confiance"
    },
    common: {
      loading: 'Chargement...',
      loadingShort: 'Chargement...',
      cancel: 'Annuler',
      close: 'Fermer',
      back: 'Retour',
      delete: 'Supprimer',
      save: 'Enregistrer',
      confirm: 'Confirmer',
      exit: 'Quitter',
      start: 'Démarrer',
      settings: 'Paramètres',
      later: 'Plus tard',
      currentUser: 'Utilisateur actuel',
      none: 'Aucun',
      minutes: '{{count}} min'
    },
    form: {
      validation: {
        required: 'Ce champ est obligatoire',
        requiredHint: 'Veuillez saisir une valeur',
        tooLong: 'Maximum {{max}} caractères',
        count: '{{count}} caractères',
        counter: '{{count}}/{{max}} caractères'
      },
      autosave: {
        saving: 'Enregistrement...',
        savedAt: 'Brouillon enregistré à {{time}}',
        editing: 'Édition...'
      }
    },
    home: {
      headline: "Décrochez l'offre plus simplement",
      subhead: "Collaboration IA, gardez le rythme",
      start: 'Démarrer',
      myPreparations: 'Mes préparations',
      emptyTitle: 'Commencez votre première préparation',
      emptyDescription: "Créez une préparation, ajoutez CV ou description de poste, et laissez l'IA analyser.",
      createNow: 'Créer',
      viewAll: 'Voir tout {{count}}',
      analyzing: 'Analyse'
    },
    slogans: {
      main: [
        'Stressé ? Respirez.',
        'Bready à vos côtés.',
        'Entretien ? Facile.'
      ]
    },
    select: {
      title: 'Préparation entretien',
      language: 'Langue',
      purpose: 'Objectif',
      empty: 'Aucune préparation',
      confirm: 'Confirmer',
      quickStart: 'Commencer sans préparation'
    },
    purposes: {
      interview: 'Entretien',
      sales: 'Vente',
      meeting: 'Réunion'
    },
    createPrep: {
      title: 'Sélectionner le type de préparation',
      subtitle: 'Choisissez le type de préparation à créer',
      types: {
        interview: {
          title: 'Entretien',
          description: "Préparez vos entretiens d'embauche, analysez l'adéquation au poste"
        },
        sales: {
          title: 'Vente',
          description: 'Préparez vos visites clients, planifiez votre stratégie commerciale'
        },
        meeting: {
          title: 'Réunion',
          description: "Préparez vos réunions importantes, organisez l'ordre du jour"
        }
      }
    },
    salesPrep: {
      titleCreate: 'Créer une préparation de vente',
      titleEdit: 'Modifier la préparation de vente',
      name: {
        title: 'Nom de la préparation',
        placeholder: 'Ex: Visite commerciale chez XX'
      },
      clientInfo: {
        title: 'Informations client',
        placeholder: "Entrez le nom de l'entreprise, secteur, taille, activité principale, décideurs..."
      },
      productInfo: {
        title: 'Informations produit/service',
        placeholder: 'Entrez les détails du produit ou service, arguments clés, stratégie de prix...'
      },
      salesGoal: {
        title: 'Objectif commercial',
        placeholder: 'Entrez les objectifs de vente, résultats attendus, jalons clés...'
      }
    },
    meetingPrep: {
      titleCreate: 'Créer une préparation de réunion',
      titleEdit: 'Modifier la préparation de réunion',
      name: {
        title: 'Nom de la préparation',
        placeholder: 'Ex: Réunion bilan Q4'
      },
      meetingTopic: {
        title: 'Sujet de la réunion',
        placeholder: 'Entrez le sujet, contexte, objectifs de la réunion...'
      },
      participants: {
        title: 'Participants',
        placeholder: 'Entrez la liste des participants, postes, rôles...'
      },
      agenda: {
        title: 'Ordre du jour',
        placeholder: "Entrez les points de l'ordre du jour, allocation du temps..."
      },
      keyPoints: {
        title: 'Points clés',
        placeholder: 'Entrez les questions clés à discuter, décisions à prendre, résultats attendus...'
      }
    },
    languages: {
      'cmn-CN': '中文',
      'en-US': 'English',
      'ja-JP': '日本語',
      'fr-FR': 'Français'
    },
    welcome: {
      title: 'Bready',
      tagline: 'Entretien stressant ? Restez calme.',
      features: {
        collaboration: {
          title: 'Collaboration intelligente',
          items: ['Analyse du CV', 'Prompts en direct']
        },
        audio: {
          title: 'Technologie audio',
          items: ['Faible latence', 'Audio sans perte']
        },
        privacy: {
          title: 'Confidentialité',
          items: ['Mode furtif', 'Données locales']
        }
      },
      cta: 'Préparer mon entretien',
      skip: 'Plus tard'
    },
    collaboration: {
      title: 'Mode collaboration',
      copySuccess: 'Copié',
      status: {
        initializing: 'Initialisation...',
        checkingPermissions: 'Vérification des autorisations...',
        permissionsIncomplete: 'Autorisations incomplètes',
        permissionsFailed: 'Échec des autorisations',
        connecting: "Connexion à l'IA...",
        apiKeyMissing: "Clé API manquante",
        audioStarting: "Démarrage de l'audio...",
        audioFailed: "Échec de l'audio",
        ready: 'Prêt',
        waitingReady: "En attente de l'IA...",
        connectFailed: 'Connexion échouée',
        initFailed: "Échec de l'initialisation",
        reconnecting: 'Reconnexion...',
        reconnectFailedRetry: 'Reconnexion échouée',
        reconnectFailed: 'Reconnexion échouée',
        disconnected: 'Déconnecté',
        preparing: 'Préparation du mode collaboration...',
        switchingAudio: "Changement du mode audio...",
        switched: 'Passé à {{mode}}',
        switchFailed: "Échec du changement",
        browserPreview: 'Aperçu navigateur',
        browserSwitched: 'Passé à {{mode}} (aperçu)'
      },
      audioMode: {
        system: {
          label: 'Audio système',
          description: "Capturer l'audio système pour les entretiens en ligne"
        },
        microphone: {
          label: 'Micro',
          description: 'Enregistrer via micro pour les échanges en direct'
        }
      },
      errors: {
        apiConnectionFailed: "Connexion API échouée",
        apiKeyMissing: "Clé API introuvable. Vérifiez VITE_GEMINI_API_KEY.",
        audioDeviceError: 'Erreur périphérique audio',
        permissionsNotSet: 'Autorisations manquantes',
        networkError: 'Erreur réseau',
        unknownError: 'Erreur inconnue',
        permissionsHint: 'Terminez les autorisations dans les paramètres',
        connectFailed: "Impossible de se connecter à l'IA",
        reconnectFailed: 'Reconnexion échouée',
        notConnected: "IA non connectée pour le moment",
        sendFailed: "Échec de l'envoi : {{error}}",
        tryAgain: 'Réessayez plus tard',
        sendError: "Erreur lors de l'envoi",
        audioInterrupted: "Flux audio interrompu, reconnectez-vous",
        audioSwitchFailed: 'Échec du passage à {{mode}}',
        audioSwitchError: 'Erreur de changement audio',
        audioStartFailed: "Impossible de démarrer l'audio"
      },
      empty: {
        system: "Bready répond à l'intervieweur",
        microphone: 'Bready répond au micro',
        helper: 'Vous pouvez aussi taper'
      },
      labels: {
        transcribing: 'Transcription...',
        input: 'Entrée',
        thinking: 'Réflexion...',
        responding: 'Réponse...',
        bready: 'Bready'
      },
      input: {
        placeholder: 'Tapez votre question...',
        helper: 'Entrée pour envoyer · Shift+Entrée pour retour'
      },
      sidebar: {
        title: 'Conversation',
        empty: 'Aucun message'
      },
      aiThinking: 'Bready réfléchit...',
      previewReply: 'Question reçue : « {{message}} » (aperçu)',
      exit: {
        title: 'Quitter le mode collaboration ?',
        description: "Déconnecte l'IA et retourne à l'accueil.",
        confirm: 'Quitter'
      },
      permissions: {
        title: 'Autorisations',
        systemAudio: 'Autorisation audio système',
        systemAudioDesc: "Capturer l'audio système",
        microphone: 'Autorisation micro',
        microphoneDesc: 'Entrée vocale',
        network: 'Réseau',
        granted: 'Autorisé',
        needsSetup: 'À configurer',
        denied: 'Refusé',
        networkConnected: 'Connecté',
        networkDisconnected: 'Déconnecté',
        networkConnectedDesc: 'Connecté à Gemini API',
        networkDisconnectedDesc: 'Essayez de reconnecter le service IA',
        reconnect: 'Reconnecter'
      },
      toasts: {
        connectionFailed: "Connexion IA échouée, retour à l'accueil"
      },
      actions: {
        copy: 'Copier',
        reconnect: 'Reconnecter'
      }
    },
    admin: {
      title: 'Console admin',
      tabs: {
        users: 'Utilisateurs',
        usage: 'Usage'
      },
      stats: {
        totalUsers: 'Utilisateurs',
        activeMembers: 'Membres actifs',
        remainingMinutes: 'Minutes restantes',
        expiringSoon: 'Expire bientôt'
      },
      search: 'Rechercher nom ou email',
      empty: 'Aucun utilisateur',
      loading: 'Chargement...',
      currentUser: 'Utilisateur actuel',
      registered: 'Inscrit',
      remaining: 'Restant',
      membership: 'Abonnement',
      role: 'Rôle',
      changeRole: 'Changer de rôle',
      roleUpdated: 'Échec de mise à jour',
      noUsage: 'Tableau de bord bientôt disponible',
      usageTitle: "Vue d'ensemble",
      totalMinutes: 'Minutes achetées',
      avgMinutes: 'Moyenne restante',
      usageHint: 'Tendance 30 jours (placeholder)',
      actions: {
        previous: 'Précédent',
        next: 'Suivant'
      }
    },
    profile: {
      title: 'Profil',
      identity: 'Rôle',
      membership: 'Abonnement',
      remainingTime: 'Temps restant',
      expiry: 'Expiration',
      totalPurchased: 'Total acheté',
      packages: 'Packs',
      minutes: '{{count}} min',
      discount: '{{percent}}% de réduction',
      buy: 'Acheter',
      admin: 'Console admin',
      logout: 'Déconnexion',
      settings: 'Préférences',
      theme: 'Thème',
      language: 'Langue',
      themeOptions: {
        light: 'Clair',
        dark: 'Sombre',
        auto: 'Système'
      },
      security: {
        title: 'Sécurité du compte',
        changePassword: 'Changer le mot de passe',
        currentPassword: 'Mot de passe actuel',
        newPassword: 'Nouveau mot de passe',
        confirmPassword: 'Confirmer le nouveau mot de passe',
        passwordMismatch: 'Les mots de passe ne correspondent pas',
        passwordTooShort: 'Le mot de passe doit contenir au moins 6 caractères',
        passwordChanged: 'Mot de passe modifié',
        passwordChangeFailed: 'Échec de modification du mot de passe',
        bindPhone: 'Lier le téléphone',
        phonePlaceholder: 'Entrez votre numéro',
        codePlaceholder: 'Code de vérification',
        sendCode: 'Envoyer le code',
        codeSent: 'Code envoyé',
        invalidPhone: 'Veuillez entrer un numéro valide',
        invalidCode: 'Veuillez entrer un code à 6 chiffres',
        phoneBound: 'Téléphone lié',
        phoneBindFailed: 'Échec de liaison du téléphone',
        bindEmail: 'Lier l’email',
        emailPlaceholder: 'Entrez votre email',
        invalidEmail: 'Veuillez entrer un email valide',
        emailBound: 'Email lié',
        emailBindFailed: 'Échec de liaison de l’email'
      }
    },
    login: {
      title: 'Bready',
      subtitleLogin: 'Connexion',
      subtitleSignup: 'Créer un compte',
      nickname: 'Nom',
      email: 'Email',
      password: 'Mot de passe',
      signup: "S'inscrire",
      login: 'Se connecter',
      phone: 'Téléphone',
      sendCode: 'Envoyer le code',
      code: 'Code',
      verify: 'Vérifier et connecter',
      resend: 'Renvoyer le code',
      google: 'Continuer avec Google',
      adminTest: 'Connexion admin test',
      switchEmail: 'Email',
      switchPhone: 'Téléphone',
      hasAccount: 'Déjà un compte ?',
      noAccount: "Pas de compte ?",
      loginNow: 'Se connecter',
      signupNow: "S'inscrire",
      placeholders: {
        nickname: 'Entrez votre nom',
        email: 'Entrez votre email',
        password: 'Entrez votre mot de passe',
        phone: 'Entrez votre téléphone',
        code: 'Entrez le code à 6 chiffres'
      },
      errors: {
        loginFailed: 'Échec de connexion',
        signupFailed: "Échec de l'inscription",
        googleFailed: 'Connexion Google échouée',
        sendCodeFailed: "Échec d'envoi du code",
        verifyFailed: 'Échec de vérification',
        testLoginFailed: 'Échec de test',
        signupSuccess: 'Inscription réussie, connexion...'
      }
    },
    prep: {
      notFoundTitle: 'Préparation introuvable',
      notFoundDescription: "La préparation demandée est introuvable.",
      backHome: "Retour à l'accueil",
      updatedAt: 'Mis à jour {{date}}',
      actions: {
        edit: 'Modifier',
        startAnalysis: "Lancer l'analyse"
      },
      sections: {
        match: 'Correspondance du poste',
        jobDescription: 'Description du poste',
        resume: 'CV',
        strengths: 'Forces',
        weaknesses: "Axes d'amélioration",
        suggestions: "Conseils d'entretien"
      },
      resumeMissing: 'CV non importé',
      resumeAdd: 'Ajouter',
      noAnalysisTitle: "Pas d'analyse IA",
      report: {
        title: 'Rapport de préparation',
        modalTitle: "Rapport d'analyse IA",
        baseInfo: 'Informations de base',
        prepName: 'Préparation',
        createdAt: 'Créé le',
        updatedAt: 'Mis à jour le',
        analysisTitle: 'Analyse IA',
        matchScore: 'Score de correspondance',
        fullScore: 'Sur {{count}}',
        strengths: 'Forces',
        weaknesses: 'Améliorations',
        suggestions: 'Recommandations',
        fileName: 'Interview_Prep_{{name}}_Report.md',
        exportSuccess: 'Rapport exporté',
        exportFailed: "Échec de l'export du rapport",
        completeInfo: 'Complétez les informations pour le rapport IA'
      },
      shareTitle: 'Préparation entretien : {{name}}',
      shareText: 'Voir mon analyse : {{name}}',
      shareCopied: 'Lien copié',
      shareFailed: 'Échec du partage'
    },
    prepList: {
      title: 'Toutes les préparations',
      count: '{{count}} préparations au total',
      empty: 'Aucune préparation',
      analyzing: 'Analyse'
    },
    prepEditor: {
      titleCreate: 'Créer une préparation',
      titleEdit: 'Modifier la préparation',
      subtitleCreate: "Préparez votre entretien",
      subtitleEdit: 'Mettez à jour votre préparation',
      name: {
        title: 'Nom de préparation',
        description: 'Entreprise - Poste, ex. ByteDance - Vente',
        placeholder: 'Entreprise - Poste, ex. ByteDance - Vente'
      },
      job: {
        title: 'Description du poste (JD)',
        description: 'Collez la description complète du poste',
        label: 'Description du poste',
        placeholder: 'Collez la description ici...'
      },
      resume: {
        title: 'CV (optionnel)',
        description: 'Téléversez ou collez votre CV',
        upload: {
          title: 'Cliquer pour téléverser le CV',
          hint: 'Formats .pdf, .doc, .docx, .txt',
          choose: 'Choisir un fichier',
          uploaded: 'Téléversé : {{name}}'
        },
        pasteLabel: 'Ou collez le CV',
        pastePlaceholder: 'Collez le CV ou infos liées...'
      },
      analysis: {
        title: 'Analyse IA',
        description: 'Analyse intelligente basée sur vos infos',
        matchScore: 'Score de correspondance',
        strengths: 'Forces',
        suggestions: "Axes d'amélioration",
        empty: "Cliquez sur le bouton pour lancer l'analyse"
      },
      actions: {
        save: 'Enregistrer',
        saving: 'Enregistrement...',
        analyze: 'Analyser avec IA',
        analyzing: 'Analyse...',
        reanalyze: "Relancer l'analyse"
      },
      toasts: {
        uploadSuccess: 'Fichier téléversé',
        uploadFailed: 'Échec de lecture du fichier',
        requiredFields: 'Veuillez saisir le nom et la description du poste',
        updateSuccess: 'Mise à jour réussie',
        createSuccess: 'Création réussie',
        saveFailed: "Échec de l'enregistrement. Réessayez.",
        analyzeFailed: 'Analyse IA échouée : {{error}}',
        analyzeSuccess: 'Analyse IA terminée',
        analyzeError: "Erreur pendant l'analyse IA"
      },
      mockAnalysis: {
        strengths: [
          'Bon alignement avec React et TypeScript',
          "3 ans d'expérience répondent aux exigences",
          'Expérience mobile et web'
        ],
        weaknesses: [
          "Peu d'expérience en architecture à grande échelle",
          'Détails de collaboration insuffisants',
          "Montrer davantage l'apprentissage de nouvelles technologies"
        ],
        suggestions: [
          'Préparez des exemples concrets de projets',
          'Mettez en avant la collaboration (reviews, partage)',
          'Montrez la maîtrise des outils frontend',
          "Apportez des exemples d'optimisation perf/UX"
        ]
      }
    },
    errorBoundary: {
      title: 'Une erreur est survenue',
      description: "L'application a rencontré une erreur inattendue. Rafraîchissez ou redémarrez.",
      reload: 'Rafraîchir',
      retry: 'Réessayer',
      details: "Voir les détails de l'erreur",
      copy: "Copier l'erreur",
      copied: 'Copié',
      labels: {
        error: 'Erreur',
        stack: 'Pile',
        componentStack: 'Pile du composant'
      }
    },
    floating: {
      status: {
        idle: 'Préparation...',
        connecting: "Connexion à l'API Gemini...",
        connected: 'Connecté, démarrage audio...',
        ready: 'Prêt',
        audioFailed: "Erreur : impossible de démarrer l'audio",
        connectFailed: "Erreur : connexion à l'API échouée",
        apiKeyMissing: 'Erreur : clé API introuvable',
        reconnecting: 'Reconnexion...',
        reconnectSuccess: 'Reconnecté',
        reconnectFailed: 'Reconnexion échouée',
        sessionClosed: 'Session fermée',
        disconnected: 'Déconnecté',
        error: 'Erreur : {{error}}',
        reconnectError: 'Erreur de reconnexion : {{error}}',
        disconnectError: 'Erreur de déconnexion : {{error}}'
      },
      labels: {
        liveTranscription: 'Transcription en direct',
        listening: 'Écoute...',
        waitingAudio: "En attente d'entrée audio",
        listeningHintTitle: "L'IA écoute",
        listeningHint: 'Commencez à parler pour une réponse en temps réel',
        waitingConnection: 'Connexion en attente...',
        initializingHint: "Initialisation de l'assistant IA",
        aiAssistant: 'Assistant IA',
        you: 'Vous',
        responding: 'Réponse...',
        inputPlaceholder: 'Tapez votre question...',
        systemAudio: 'Audio système',
        clearHistory: 'Effacer',
        clearHistoryTitle: "Effacer l'historique",
        opacity: 'Opacité',
        reconnect: 'Reconnecter'
      }
    },
    monitoring: {
      title: 'Surveillance système',
      close: 'Fermer',
      loading: 'Chargement des données...',
      systemStatus: 'État du système',
      monitoringSystem: 'Système de surveillance',
      running: 'Actif',
      stopped: 'Arrêté',
      metricsTotal: 'Indicateurs de performance (total : {{count}})',
      errorsTotal: 'Erreurs (total : {{count}})',
      noErrors: 'Aucune erreur',
      actionsTotal: 'Actions utilisateur (total : {{count}})',
      noActions: 'Aucune action',
      hint: 'Ctrl+Shift+M pour afficher/masquer le panneau'
    },
    permissionsSetup: {
      title: 'Autorisations Live Interview',
      description: 'Pour utiliser Live Interview, configurez ces autorisations.',
      checking: 'Vérification des autorisations...',
      screen: {
        title: 'Enregistrement écran',
        description: "Capturer l'audio système",
        openSettings: 'Ouvrir les réglages système'
      },
      microphone: {
        title: 'Microphone',
        description: 'Entrée vocale (optionnel)',
        request: "Demander l'autorisation",
        openSettings: 'Ouvrir les réglages système'
      },
      apiKey: {
        title: 'Clé API Gemini',
        description: 'Pour les fonctionnalités IA',
        hint: 'Définissez VITE_GEMINI_API_KEY dans .env.local'
      },
      audio: {
        title: 'Périphérique audio',
        description: 'Capture audio système',
        test: 'Tester la capture audio',
        setup: 'Ouvrir les réglages'
      },
      testFailed: 'Test échoué',
      status: {
        granted: 'Autorisé',
        needsSetup: 'À configurer',
        denied: 'Refusé'
      },
      error: {
        unableCheck: 'Impossible de vérifier les autorisations'
      },
      actions: {
        skip: 'Ignorer',
        recheck: 'Revérifier',
        start: 'Démarrer Live Interview',
        complete: 'Terminer la configuration'
      },
      metrics: {
        capturedData: 'Données capturées : {{bytes}} octets',
        silence: 'Silence : {{percent}}%',
        recommendation: 'Conseil : {{text}}'
      }
    },
    permissionsGuide: {
      title: 'Autorisations système',
      description: 'Le mode collaboration nécessite des autorisations :',
      screen: 'Enregistrement écran',
      screenDesc: 'Capturer audio système',
      mic: 'Microphone',
      micDesc: 'Entrée vocale',
      later: 'Plus tard',
      note: 'Reconfigurable en mode collaboration'
    },
    alerts: {
      deletePreparation: 'Supprimer cette préparation ? Cette action est définitive.',
      deleteFailed: 'Suppression échouée',
      startCollabFailed: 'Impossible de démarrer la collaboration',
      onlyAdmin: 'Seuls les admins peuvent changer les rôles',
      updateRoleFailed: 'Échec de mise à jour du rôle',
      loadUsersFailed: 'Chargement des utilisateurs échoué',
      purchaseFailed: "Échec de l'achat",
      signOutFailed: 'Déconnexion échouée'
    }
  }
}
