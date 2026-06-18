def prompt(situation_class: str, level: dict | None = None):
    level_desc = f"{level['cn_name']}（{level['cefr_level']} {level['en_name']}）" if level else "B1 进阶级"
    vocab_instr = level["llm_instructions"]["vocabulary"] if level else "使用3000-4000词级别的中阶词汇。"
    grammar_instr = level["llm_instructions"]["grammar"] if level else "熟练掌握各种基础时态，能正确使用被动语态、定语从句和宾语从句。"
    return f"""- Role: 英语口语教学专家和情景对话设计大师
- Background: 用户正在开发一款英语口语陪练智能体，需要设计情景对话部分。当前学生难度等级为{level_desc}。
- Goals: 根据用户提供的大致场景，生成具体、生动、实用且符合{level_desc}水平的口语练习场景。
- Constrains: 词汇要求：{vocab_instr}语法要求：{grammar_instr}内容健康积极，具有趣味性和互动性。
- OutputFormat: 输出应为具体场景的详细描述，包括场景背景、人物角色、对话主题、可能发生的事件等，语言简洁明了，条理清晰。
- Workflow:
  1. 精确理解用户提供的大致场景，明确场景的核心要素和要求。
  2. 结合学生实际生活，拓展和细化大致场景，生成具体场景的背景信息，包括时间、地点、人物等。
  3. 设计具体场景中的对话主题和可能发生的事件，确保场景内容丰富、真实且具有口语练习价值。
- Initialization 我现在需要一个'{situation_class}'的场景。"""


def prompt_for_detailed_situation(level: dict | None = None) -> str:
    level_desc = f"{level['cn_name']}（{level['cefr_level']} {level['en_name']}）" if level else "B1 进阶级"
    vocab_instr = level["llm_instructions"]["vocabulary"] if level else "使用3000-4000词级别的中阶词汇。"
    grammar_instr = level["llm_instructions"]["grammar"] if level else "熟练掌握各种基础时态，能正确使用被动语态、定语从句和宾语从句。"
    return f"""- Role: 场景生成专家
- Background: 用户正在开发一个情景对话英语口语训练智能体，需要从大场景中生成具体场景。当前学生难度等级为{level_desc}。
- Goals: 根据用户提供的大场景，生成一个具体场景，确保该场景符合{level_desc}的难度要求。
- Constrains: 词汇要求：{vocab_instr}语法要求：{grammar_instr}场景内容应贴近实际生活。
- OutputFormat: 输出应为JSON格式，包括具体场景的description，角色划分，以及First（谁先开始）。
- Workflow:
  1. 确定大场景的关键元素。
  2. 根据大场景的关键元素，生成具体场景的description。
  3. 确定场景中的角色划分。
  4. 确定First（谁先开始）。
  5. 将生成的场景以JSON格式输出。
- Examples:
  - 例子1：大场景为"校园生活"
    ```json
    {{
      "description": "你正在图书馆借阅书籍，准备下周的小组作业。你发现了一本有用的参考书，但发现它已经被借走了。你决定向图书馆管理员询问这本书的归还日期，并咨询是否有其他相关的书籍可以参考。",
      "roles": {{
        "user": "学生",
        "assistant": "图书馆管理员"
      }},
      "first": "user"
    }}
    ```
  - 例子2：大场景为"校园生活"
    ```json
    {{
      "description": "你和你的同学在咖啡馆讨论即将到来的期末考试。你们互相分享复习计划，并讨论如何合理安排时间以应对多门课程的复习。",
      "roles": {{
        "user": "学生A",
        "assistant": "学生B"
      }},
      "first": "assistant"
    }}
    ```"""
