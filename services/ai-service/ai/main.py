from typing import List

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="VitalityLens AI Service", version="0.1.0")


class LabTest(BaseModel):
    name: str
    value: float | None = Field(default=None)
    unit: str | None = None
    ref_low: float | None = None
    ref_high: float | None = None


class AnalysisRequest(BaseModel):
    tests: List[LabTest]
    raw_text: str | None = None


class AnalysisResponse(BaseModel):
    summary: str
    recommendations: List[str]


@app.post("/analyze/lab-report", response_model=AnalysisResponse)
async def analyze_lab_report(payload: AnalysisRequest) -> AnalysisResponse:
    if not payload.tests:
        summary = "No recognizable lab values were extracted from your document."
        recommendations = ["Consider uploading a clearer image or PDF for analysis."]
        return AnalysisResponse(summary=summary, recommendations=recommendations)

    highlighted_tests = ", ".join(
        f"{test.name} {test.value or 'n/a'} {test.unit or ''}".strip() for test in payload.tests
    )
    summary = (
        "We reviewed your document and identified the following lab results: "
        f"{highlighted_tests}. Please review these findings with your healthcare professional."
    )

    recommendations = [
        "Maintain regular follow-ups with your doctor to interpret these results in context.",
        "Adopt healthy lifestyle habits in consultation with a qualified clinician.",
    ]

    return AnalysisResponse(summary=summary, recommendations=recommendations)


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
