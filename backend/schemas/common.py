from typing import Optional

from pydantic import BaseModel


class MessageAnalysisReport(BaseModel):
    index: int
    role: str
    content: str
    grammar_analysis: Optional[str]
    pronunciation_analysis: Optional[str]

    def __str__(self):
        return f"""第{self.index}句，{self.role}: {self.content}
语法分析: {self.grammar_analysis}
发音分析: {self.pronunciation_analysis}"""
