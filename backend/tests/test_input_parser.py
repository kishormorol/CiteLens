import pytest
from app.services.input_parser import parse_input
from app.utils.exceptions import InputParseError


# --- arXiv -------------------------------------------------------------------

def test_parse_arxiv_id_new_format():
    result = parse_input("1706.03762")
    assert result.input_type == "arxiv_id"
    assert result.value == "1706.03762"


def test_parse_arxiv_id_with_version_stripped():
    result = parse_input("1706.03762v5")
    assert result.input_type == "arxiv_id"
    assert result.value == "1706.03762"


def test_parse_arxiv_abs_url():
    result = parse_input("https://arxiv.org/abs/1706.03762")
    assert result.input_type == "arxiv_url"
    assert result.value == "1706.03762"


def test_parse_arxiv_pdf_url():
    result = parse_input("https://arxiv.org/pdf/1706.03762.pdf")
    assert result.input_type == "arxiv_url"
    assert result.value == "1706.03762"


# --- DOI ---------------------------------------------------------------------

def test_parse_bare_doi():
    result = parse_input("10.1145/3292500.3330646")
    assert result.input_type == "doi"
    assert result.value == "10.1145/3292500.3330646"


def test_parse_doi_url_https():
    result = parse_input("https://doi.org/10.18653/v1/N19-1423")
    assert result.input_type == "doi_url"
    assert result.value == "10.18653/v1/N19-1423"


def test_parse_doi_url_dx():
    result = parse_input("http://dx.doi.org/10.1038/nature14539")
    assert result.input_type == "doi_url"
    assert result.value == "10.1038/nature14539"


# --- Semantic Scholar --------------------------------------------------------

def test_parse_semantic_scholar_url():
    result = parse_input("https://www.semanticscholar.org/paper/Attention-Is-All-You-Need/204e3073870fae3d05bcbc2f6a8e263d9b72e776")
    assert result.input_type == "semantic_scholar_url"
    assert result.value == "204e3073870fae3d05bcbc2f6a8e263d9b72e776"


# --- Title fallback ----------------------------------------------------------

def test_parse_plain_title():
    result = parse_input("Attention Is All You Need")
    assert result.input_type == "title"
    assert result.value == "Attention Is All You Need"


def test_parse_long_title():
    title = "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding"
    result = parse_input(title)
    assert result.input_type == "title"


# --- Error cases -------------------------------------------------------------

def test_parse_empty_raises():
    with pytest.raises(InputParseError):
        parse_input("")


def test_parse_whitespace_only_raises():
    with pytest.raises(InputParseError):
        parse_input("   ")
