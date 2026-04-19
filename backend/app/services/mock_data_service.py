"""
Mock data service — returns realistic data without any API calls.

Active when:
  - settings.USE_MOCK_DATA = true
  - or when the live pipeline encounters a fatal error and graceful fallback is requested

Mock seed: "Attention Is All You Need" (Vaswani et al., 2017)
Mock citing papers: 10 realistic papers from 2018–2023.
"""

from app.models.paper import RawPaper
from app.models.api import (
    AnalyzePaperResponse, SeedPaper, RankedPaper, ScoreBreakdown, SummaryInfo,
)

_SEED = RawPaper(
    id="204e3073870fae3d05bcbc2f6a8e263d9b72e776",
    title="Attention Is All You Need",
    authors=["Ashish Vaswani", "Noam Shazeer", "Niki Parmar", "Jakob Uszkoreit",
             "Llion Jones", "Aidan N. Gomez", "Lukasz Kaiser", "Illia Polosukhin"],
    abstract=(
        "The dominant sequence transduction models are based on complex recurrent or "
        "convolutional neural networks that include an encoder and a decoder. The best "
        "performing models also connect the encoder and decoder through an attention "
        "mechanism. We propose a new simple network architecture, the Transformer, "
        "based solely on attention mechanisms, dispensing with recurrence and "
        "convolutions entirely."
    ),
    year=2017,
    venue="NeurIPS",
    arxiv_id="1706.03762",
    doi="10.48550/arXiv.1706.03762",
    semantic_scholar_id="204e3073870fae3d05bcbc2f6a8e263d9b72e776",
    citation_count=142318,
    influential_citation_count=28411,
    citation_normalized_percentile=0.999,
    fwci=312.4,
    sources=["Semantic Scholar", "OpenAlex"],
)

# Citing papers: realistic metadata with pre-computed scores
_CITING_PAPERS = [
    {
        "paper": RawPaper(
            id="df2b0e26d0599ce3e70df8a9da02e51594e0e992",
            title="BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
            authors=["Jacob Devlin", "Ming-Wei Chang", "Kenton Lee", "Kristina Toutanova"],
            abstract=(
                "We introduce a new language representation model called BERT, which stands for "
                "Bidirectional Encoder Representations from Transformers. Unlike recent language "
                "representation models, BERT is designed to pre-train deep bidirectional representations "
                "from unlabeled text by jointly conditioning on both left and right context."
            ),
            year=2019, venue="NAACL", arxiv_id="1810.04805",
            doi="10.18653/v1/N19-1423",
            semantic_scholar_id="df2b0e26d0599ce3e70df8a9da02e51594e0e992",
            citation_count=55712, influential_citation_count=12500,
            citation_normalized_percentile=0.999, fwci=145.2,
            is_highly_influential=True,
            fields_of_study=["Computer Science"],
            sources=["Semantic Scholar", "OpenAlex"],
        ),
        "impact": 0.97, "network": 0.95, "relevance": 0.91, "intent": 1.0, "final": 0.96,
    },
    {
        "paper": RawPaper(
            id="9405cc0d6169988371b2755e573cc28650d14dfe",
            title="Language Models are Few-Shot Learners",
            authors=["Tom B. Brown", "Benjamin Mann", "Nick Ryder", "Melanie Subbiah", "et al."],
            abstract=(
                "We demonstrate that scaling language models greatly improves task-agnostic, "
                "few-shot performance, sometimes even reaching competitiveness with prior "
                "state-of-the-art fine-tuning approaches."
            ),
            year=2020, venue="NeurIPS", arxiv_id="2005.14165",
            semantic_scholar_id="9405cc0d6169988371b2755e573cc28650d14dfe",
            citation_count=31402, influential_citation_count=8900,
            citation_normalized_percentile=0.998, fwci=98.7,
            is_highly_influential=True,
            fields_of_study=["Computer Science"],
            sources=["Semantic Scholar", "OpenAlex"],
        ),
        "impact": 0.95, "network": 0.93, "relevance": 0.87, "intent": 1.0, "final": 0.94,
    },
    {
        "paper": RawPaper(
            id="7d866d7e36f90c6baef5f2f0d7b1f4b0e5b4a8c1",
            title="An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale",
            authors=["Alexey Dosovitskiy", "Lucas Beyer", "Alexander Kolesnikov", "et al."],
            abstract=(
                "While the Transformer architecture has become the de-facto standard for NLP tasks, "
                "its applications to computer vision remain limited. We show that a pure transformer "
                "applied directly to sequences of image patches can perform very well on image "
                "classification tasks."
            ),
            year=2021, venue="ICLR", arxiv_id="2010.11929",
            semantic_scholar_id="7d866d7e36f90c6baef5f2f0d7b1f4b0e5b4a8c1",
            citation_count=22415, influential_citation_count=5200,
            citation_normalized_percentile=0.996, fwci=72.3,
            is_highly_influential=True,
            fields_of_study=["Computer Science"],
            sources=["Semantic Scholar", "OpenAlex"],
        ),
        "impact": 0.92, "network": 0.89, "relevance": 0.82, "intent": 1.0, "final": 0.91,
    },
    {
        "paper": RawPaper(
            id="a3c59a8be94e78e8c3b94d77e0c8a7de4b1d6f2e",
            title="A Survey of Transformers",
            authors=["Tianyang Lin", "Yuxin Wang", "Xiangyang Liu", "Xipeng Qiu"],
            abstract=(
                "Transformers have achieved great success in many artificial intelligence fields, "
                "such as natural language processing, computer vision, and audio processing. "
                "Therefore, it is natural to attract lots of interest from academic and industry "
                "researchers."
            ),
            year=2022, venue="AI Open",
            doi="10.1016/j.aiopen.2022.10.001",
            semantic_scholar_id="a3c59a8be94e78e8c3b94d77e0c8a7de4b1d6f2e",
            citation_count=8721, influential_citation_count=1200,
            citation_normalized_percentile=0.992, fwci=28.4,
            is_highly_influential=False,
            fields_of_study=["Computer Science"],
            sources=["Semantic Scholar", "OpenAlex"],
        ),
        "impact": 0.88, "network": 0.74, "relevance": 0.78, "intent": 0.0, "final": 0.86,
    },
    {
        "paper": RawPaper(
            id="e965c40a04c3e3f4ee9c8e9a9b5e6f2a3d7c1b4e",
            title="Scaling Laws for Neural Language Models",
            authors=["Jared Kaplan", "Sam McCandlish", "Tom Henighan", "et al."],
            abstract=(
                "We study empirical scaling laws for language model performance on the "
                "cross-entropy loss. The loss scales as a power-law with model size, dataset size, "
                "and the amount of compute used for training, with some trends spanning more than "
                "seven orders of magnitude."
            ),
            year=2020, venue="arXiv", arxiv_id="2001.08361",
            semantic_scholar_id="e965c40a04c3e3f4ee9c8e9a9b5e6f2a3d7c1b4e",
            citation_count=6413, influential_citation_count=1800,
            citation_normalized_percentile=0.990, fwci=21.2,
            is_highly_influential=True,
            fields_of_study=["Computer Science"],
            sources=["Semantic Scholar", "OpenAlex"],
        ),
        "impact": 0.85, "network": 0.77, "relevance": 0.72, "intent": 1.0, "final": 0.84,
    },
    {
        "paper": RawPaper(
            id="b91c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c",
            title="FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness",
            authors=["Tri Dao", "Daniel Y. Fu", "Stefano Ermon", "Atri Rudra", "Christopher Ré"],
            abstract=(
                "Transformers are slow and memory-hungry on long sequences, since the time and "
                "memory complexity of self-attention are quadratic in sequence length. We propose "
                "FlashAttention, an IO-aware exact attention algorithm that uses tiling to reduce "
                "the number of memory reads/writes between GPU HBM and SRAM."
            ),
            year=2022, venue="NeurIPS", arxiv_id="2205.14135",
            semantic_scholar_id="b91c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c",
            citation_count=5126, influential_citation_count=1400,
            citation_normalized_percentile=0.988, fwci=17.8,
            is_highly_influential=True,
            fields_of_study=["Computer Science"],
            sources=["Semantic Scholar", "OpenAlex"],
        ),
        "impact": 0.83, "network": 0.81, "relevance": 0.84, "intent": 1.0, "final": 0.83,
    },
    {
        "paper": RawPaper(
            id="c12d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d",
            title="Efficient Transformers: A Survey",
            authors=["Yi Tay", "Mostafa Dehghani", "Dara Bahri", "Donald Metzler"],
            abstract=(
                "Transformers have become the de facto standard for a wide range of natural language "
                "processing and sequence-to-sequence tasks. With this growth has come a proliferation "
                "of efficient Transformer models, all aiming to address the quadratic memory and "
                "computational cost of the self-attention mechanism."
            ),
            year=2022, venue="ACM Computing Surveys",
            doi="10.1145/3530811",
            semantic_scholar_id="c12d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d",
            citation_count=3987, influential_citation_count=890,
            citation_normalized_percentile=0.985, fwci=13.1,
            is_highly_influential=False,
            fields_of_study=["Computer Science"],
            sources=["Semantic Scholar", "OpenAlex"],
        ),
        "impact": 0.80, "network": 0.69, "relevance": 0.80, "intent": 0.0, "final": 0.80,
    },
    {
        "paper": RawPaper(
            id="d23e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e",
            title="Longformer: The Long-Document Transformer",
            authors=["Iz Beltagy", "Matthew E. Peters", "Arman Cohan"],
            abstract=(
                "Transformer-based models are unable to process long sequences due to their "
                "self-attention operation, which scales quadratically with the sequence length. "
                "We introduce the Longformer with an attention mechanism that scales linearly "
                "with sequence length, making it easy to process documents of thousands of tokens."
            ),
            year=2020, venue="arXiv", arxiv_id="2004.05150",
            semantic_scholar_id="d23e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e",
            citation_count=3241, influential_citation_count=720,
            citation_normalized_percentile=0.983, fwci=10.7,
            is_highly_influential=True,
            fields_of_study=["Computer Science"],
            sources=["Semantic Scholar", "OpenAlex"],
        ),
        "impact": 0.77, "network": 0.65, "relevance": 0.77, "intent": 1.0, "final": 0.77,
    },
    {
        "paper": RawPaper(
            id="e34f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f",
            title="Transformers in Vision: A Survey",
            authors=["Salman H. Khan", "Muzammal Naseer", "Munawar Hayat", "et al."],
            abstract=(
                "Transformers have gained significant attention in various vision tasks including "
                "image classification, object detection, action recognition, semantic segmentation, "
                "and video understanding."
            ),
            year=2022, venue="ACM Computing Surveys",
            doi="10.1145/3505244",
            semantic_scholar_id="e34f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f",
            citation_count=2805, influential_citation_count=430,
            citation_normalized_percentile=0.980, fwci=9.2,
            is_highly_influential=False,
            fields_of_study=["Computer Science"],
            sources=["Semantic Scholar", "OpenAlex"],
        ),
        "impact": 0.73, "network": 0.58, "relevance": 0.69, "intent": 0.0, "final": 0.72,
    },
    {
        "paper": RawPaper(
            id="f45a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a",
            title="Pre-trained Models for Natural Language Processing: A Survey",
            authors=["Xipeng Qiu", "Tianxiang Sun", "Yige Xu", "et al."],
            abstract=(
                "Recently, the emergence of pre-trained models has brought natural language "
                "processing into a new era. In this survey, we provide a comprehensive review "
                "of the pre-trained models for NLP."
            ),
            year=2020, venue="Science China Technological Sciences",
            doi="10.1007/s11431-020-1647-3",
            semantic_scholar_id="f45a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a",
            citation_count=2104, influential_citation_count=310,
            citation_normalized_percentile=0.977, fwci=7.5,
            is_highly_influential=False,
            fields_of_study=["Computer Science"],
            sources=["Semantic Scholar", "OpenAlex"],
        ),
        "impact": 0.69, "network": 0.51, "relevance": 0.73, "intent": 0.0, "final": 0.68,
    },
]


def _why(title: str, impact: float, relevant: float, intent: float) -> str:
    parts = []
    if impact >= 0.90:
        parts.append("exceptionally high citation impact")
    elif impact >= 0.75:
        parts.append("strong citation impact")
    if intent == 1.0:
        parts.append("marked as highly influential citation by Semantic Scholar")
    if relevant >= 0.80:
        parts.append("strong topical relevance to the seed paper")
    if not parts:
        parts.append("balanced citation and relevance signals")
    return "Ranked here due to: " + ", and ".join(parts) + "."


def _breakdown(paper: RawPaper, impact: float, network: float, relevance: float) -> ScoreBreakdown:
    cnp = paper.citation_normalized_percentile
    fwci = paper.fwci
    return ScoreBreakdown(
        impact=f"Top {int((1 - cnp) * 100) if cnp else '?'}% cited in field. FWCI {fwci:.1f}×." if fwci else "High citation count.",
        network="Local citation graph PageRank (mock).",
        relevance="Token-overlap with seed title and abstract.",
        context="Highly influential citation." if paper.is_highly_influential else "Standard citation.",
    )


def get_mock_analyze_response() -> AnalyzePaperResponse:
    """Return a complete mock AnalyzePaperResponse (no API calls)."""
    seed_api = SeedPaper(
        id=_SEED.id,
        title=_SEED.title,
        authors=_SEED.authors,
        abstract=_SEED.abstract,
        year=_SEED.year,
        venue=_SEED.venue,
        doi=_SEED.doi,
        arxiv_id=_SEED.arxiv_id,
        url="https://arxiv.org/abs/1706.03762",
        citation_count=_SEED.citation_count,
        sources=_SEED.sources,
    )

    results = []
    for item in _CITING_PAPERS:
        p: RawPaper = item["paper"]
        impact = float(item["impact"])
        network = float(item["network"])
        relevance = float(item["relevance"])
        intent = float(item["intent"])
        final = float(item["final"])

        url = None
        if p.arxiv_id:
            url = f"https://arxiv.org/abs/{p.arxiv_id}"
        elif p.doi:
            url = f"https://doi.org/{p.doi}"

        badges = []
        if p.is_highly_influential:
            badges.append("Highly Influential")
        if impact >= 0.88:
            badges.append("High Impact")
        if relevance >= 0.80:
            badges.append("Highly Relevant")

        results.append(RankedPaper(
            id=p.id,
            title=p.title,
            authors=p.authors,
            abstract=p.abstract,
            year=p.year,
            venue=p.venue,
            doi=p.doi,
            url=url,
            citation_count=p.citation_count,
            citation_normalized_percentile=p.citation_normalized_percentile,
            fwci=p.fwci,
            impact_score=impact,
            network_score=network,
            relevance_score=relevance,
            citation_intent_score=intent,
            final_score=final,
            highly_influential=p.is_highly_influential,
            badges=badges,
            why_ranked=_why(p.title, impact, relevance, intent),
            breakdown=_breakdown(p, impact, network, relevance),
        ))

    return AnalyzePaperResponse(
        seed_paper=seed_api,
        summary=SummaryInfo(
            total_citing_papers=1284,
            ranked_candidates=len(results),
            sources_used=["Semantic Scholar", "OpenAlex"],
            mock_mode=True,
        ),
        results=results,
    )


def get_mock_seed() -> RawPaper:
    return _SEED
