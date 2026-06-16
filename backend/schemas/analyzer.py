from typing import Optional, Dict

from pydantic import BaseModel


class AnalyzeGrammarRequest(BaseModel):
    text: str


class AnalyzePronunciationResponse(BaseModel):
    pron_analysis: str
    pron_score: dict


class AnalyzeGrammarResponse(BaseModel):
    gram_analysis: str


class AnalysisSaveRequest(BaseModel):
    message_id: str
    gram_analysis: str
    pron_analysis: str
    pron_score: Optional[Dict] = None


class GlobalAnalysisResponse(BaseModel):
    grammar_analysis: str
    pronunciation_analysis: str
    expression_analysis: str
