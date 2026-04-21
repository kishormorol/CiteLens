import type { SeedPaper, Paper, AccentDef, AccentColor } from '../types'

export const SEED_PAPER: SeedPaper = {
  title: 'Attention Is All You Need',
  authors: 'Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin',
  venue: 'NeurIPS',
  year: 2017,
  citations: '142,318',
  citingCount: '1,284',
  sources: ['OpenAlex', 'Semantic Scholar', 'Crossref'],
  abstract:
    'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.',
}

export const PAPERS: Paper[] = [
  {
    id: 1,
    title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
    authors: 'Devlin, Chang, Lee, Toutanova',
    venue: 'NeurIPS',
    year: 2019,
    citations: 89420,
    impact: 98,
    network: 95,
    relevance: 97,
    context: 96,
    final: 97,
    badges: ['Direct Citation', 'Highly Influential'],
    review: false,
    highlyInfluential: true,
    why: 'BERT directly extends the Transformer architecture from "Attention Is All You Need" to pre-training, achieving state-of-the-art on 11 NLP tasks. It has the highest network centrality among all citing papers.',
    breakdown: {
      impact:
        'Cited by 89K+ papers with an h-index impact of 98/100, among the most-cited ML papers ever published.',
      network:
        'Network centrality score 95/100 — sits at the intersection of NLP, pre-training, and fine-tuning research clusters.',
      relevance:
        'Directly implements and extends the Transformer encoder, with 97% architectural overlap with the seed paper.',
      context:
        'Foundational follow-on that spawned an entire paradigm shift; context score reflects its role as a paradigm anchor.',
    },
    abstract:
      'We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text.',
  },
  {
    id: 2,
    title: 'Language Models are Few-Shot Learners (GPT-3)',
    authors: 'Brown, Mann, Ryder, Subbiah, Kaplan, Dhariwal, Neelakantan, et al.',
    venue: 'NeurIPS',
    year: 2020,
    citations: 54200,
    impact: 95,
    network: 92,
    relevance: 94,
    context: 95,
    final: 94,
    badges: ['Direct Citation', 'Highly Influential'],
    review: false,
    highlyInfluential: true,
    why: 'GPT-3 scales the Transformer decoder to 175B parameters, demonstrating few-shot learning capabilities that redefined what language models can do without fine-tuning.',
    breakdown: {
      impact:
        'Cited by 54K papers; GPT-3 triggered a new wave of large language model research and commercial applications.',
      network:
        'High network bridging score (92/100) — connects seed Transformer research to scaling laws and emergent abilities literature.',
      relevance:
        'Directly builds on the decoder-only Transformer; 94% of core mechanisms trace back to the seed architecture.',
      context:
        'Few-shot prompting paradigm introduced here is now the dominant interaction model for LLMs; context score 95/100.',
    },
    abstract:
      'We train GPT-3, an autoregressive language model with 175 billion parameters, and test its performance in the few-shot setting, finding it can achieve strong performance on many NLP datasets.',
  },
  {
    id: 3,
    title: 'An Image is Worth 16×16 Words: Transformers for Image Recognition at Scale (ViT)',
    authors: 'Dosovitskiy, Beyer, Kolesnikov, Weissenborn, Zhai, et al.',
    venue: 'ICLR',
    year: 2021,
    citations: 31800,
    impact: 92,
    network: 88,
    relevance: 89,
    context: 90,
    final: 90,
    badges: ['Direct Citation', 'Cross-domain'],
    review: false,
    highlyInfluential: false,
    why: 'ViT transplants the pure Transformer architecture into computer vision, proving that attention mechanisms are not limited to sequential data — a pivotal cross-domain validation of the seed paper.',
    breakdown: {
      impact:
        'Cited by 31K+ papers; established Vision Transformers as the dominant paradigm in computer vision within two years.',
      network:
        'Strong bridge node (88/100) between NLP Transformers and computer vision communities.',
      relevance:
        'Applies virtually the same architecture with minimal modification; patch embeddings replace token embeddings.',
      context:
        'Validates that the attention mechanism is a general-purpose building block, not a language-specific one.',
    },
    abstract:
      'While the Transformer architecture has become the de-facto standard for NLP tasks, its applications to computer vision remain limited. We show that a pure transformer applied directly to sequences of image patches can perform very well on image classification tasks.',
  },
  {
    id: 4,
    title: 'A Survey of Transformers',
    authors: 'Lin, Wang, Liu, Qiu',
    venue: 'AI Open',
    year: 2022,
    citations: 4900,
    impact: 72,
    network: 94,
    relevance: 88,
    context: 82,
    final: 86,
    badges: ['Survey', 'Comprehensive'],
    review: true,
    highlyInfluential: false,
    why: 'This comprehensive survey organizes the entire Transformer literature — 500+ papers — into a coherent taxonomy of variants, making it the primary reference for new researchers entering the field.',
    breakdown: {
      impact:
        'Cited by 4.9K papers; high multiplier effect as a survey that directs readers to primary sources.',
      network:
        'Highest network score of any survey (94/100) — touches every major Transformer research cluster.',
      relevance:
        'Centers on the exact architecture introduced in the seed paper; extremely high topical relevance.',
      context:
        'Provides the authoritative map of how seed-paper contributions evolved across domains.',
    },
    abstract:
      'Transformers have achieved great success in many artificial intelligence fields. This survey focuses on three aspects: the efficient design of transformer model, the pre-training methods, and the applications of transformer across domains.',
  },
  {
    id: 5,
    title: 'Scaling Laws for Neural Language Models',
    authors: 'Kaplan, McCandlish, Henighan, Brown, Chess, Child, Gray, Radford, Wu, Amodei',
    venue: 'arXiv',
    year: 2020,
    citations: 6200,
    impact: 88,
    network: 82,
    relevance: 83,
    context: 87,
    final: 85,
    badges: ['Foundational', 'arXiv'],
    review: false,
    highlyInfluential: false,
    why: 'Establishes the empirical scaling laws that govern how Transformer performance improves with model size, data, and compute — directly enabling the rational design of subsequent large Transformer models.',
    breakdown: {
      impact:
        'Cited by 6.2K papers; provided the theoretical foundation for every large model trained after 2020.',
      network:
        'Central to the scaling sub-community but less connected to application domains; network 82/100.',
      relevance:
        'Studies Transformer-specific scaling properties; highly relevant to seed architecture efficiency questions.',
      context:
        'Defined the "scaling laws" paradigm; context score reflects its role in directing research investment.',
    },
    abstract:
      'We study empirical scaling laws for language model performance on the cross-entropy loss. The loss scales as a power-law with model size, dataset size, and the amount of compute used for training.',
  },
  {
    id: 6,
    title: 'Efficient Transformers: A Survey',
    authors: 'Tay, Dehghani, Bahri, Metzler',
    venue: 'ACM Computing Surveys',
    year: 2022,
    citations: 3800,
    impact: 68,
    network: 88,
    relevance: 84,
    context: 78,
    final: 80,
    badges: ['Survey', 'Efficiency'],
    review: true,
    highlyInfluential: false,
    why: 'Systematically categorizes all approaches to making Transformers computationally efficient — a direct response to the quadratic complexity bottleneck identified after the seed paper.',
    breakdown: {
      impact:
        'Cited by 3.8K papers; high reference value for practitioners optimizing Transformer deployments.',
      network:
        'Strong connectivity (88/100) across efficiency, hardware, and NLP research clusters.',
      relevance:
        'Directly addresses limitations of the seed architecture; high relevance to practitioners.',
      context:
        'Frames the efficiency problem as the central challenge of Transformer scaling; useful context score.',
    },
    abstract:
      'Recent advances in Transformer efficiency have spanned many directions, from sparse attention to linear attention, memory compression, and hardware-aware design. This survey provides a comprehensive taxonomy.',
  },
  {
    id: 7,
    title: 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness',
    authors: 'Dao, Fu, Ermon, Rudra, Ré',
    venue: 'NeurIPS',
    year: 2022,
    citations: 5400,
    impact: 85,
    network: 80,
    relevance: 84,
    context: 83,
    final: 83,
    badges: ['Direct Citation', 'Systems'],
    review: false,
    highlyInfluential: false,
    why: 'FlashAttention makes exact attention 2–4× faster and 5–20× more memory efficient by restructuring the computation to minimize HBM reads/writes — a crucial engineering breakthrough for running large Transformers.',
    breakdown: {
      impact:
        'Cited by 5.4K papers; now the default attention implementation in PyTorch and most Transformer libraries.',
      network:
        'Bridges ML systems, hardware co-design, and algorithm research communities; network 80/100.',
      relevance:
        'Implements the exact same attention formula from the seed paper but with superior complexity.',
      context:
        'Enabled context lengths up to 100K+ tokens; unlocked new application domains for the Transformer.',
    },
    abstract:
      'We propose FlashAttention, an IO-aware exact attention algorithm that uses tiling to reduce memory reads/writes between GPU high bandwidth memory and on-chip SRAM.',
  },
  {
    id: 8,
    title: 'Longformer: The Long-Document Transformer',
    authors: 'Beltagy, Peters, Cohan',
    venue: 'arXiv',
    year: 2020,
    citations: 4200,
    impact: 74,
    network: 76,
    relevance: 80,
    context: 76,
    final: 77,
    badges: ['Direct Citation', 'Long Context'],
    review: false,
    highlyInfluential: false,
    why: 'Longformer introduces a linear-scaling sliding-window attention that enables processing documents up to 4,096 tokens — directly addressing the quadratic complexity of the seed paper\'s attention mechanism.',
    breakdown: {
      impact:
        'Cited by 4.2K papers; widely adopted for long-document NLP tasks in legal, biomedical, and scientific domains.',
      network:
        'Moderate network centrality (76/100); primarily within NLP long-context research cluster.',
      relevance:
        'Modifies the seed\'s attention mechanism specifically; high architectural overlap at 80/100.',
      context:
        'Opened the long-document processing track that eventually led to 100K+ context models.',
    },
    abstract:
      'Transformer-based models are unable to process long sequences due to their self-attention operation, which scales quadratically with the sequence length. To address this limitation, we introduce the Longformer with an attention mechanism that scales linearly.',
  },
]

export const EXAMPLE_CHIPS: { label: string; query: string; type: string }[] = [
  { label: 'arXiv:1706.03762', query: '1706.03762', type: 'arXiv' },
  { label: '10.48550/arXiv.1706.03762', query: '10.48550/arXiv.1706.03762', type: 'DOI' },
  { label: 'semanticscholar.org/…', query: 'https://www.semanticscholar.org/paper/Attention-is-All-you-Need-Vaswani-Shazeer/204e3073870fae3d05bcbc2f6a8e263d9b72e776', type: 'S2' },
  { label: 'Attention Is All You Need', query: 'Attention Is All You Need', type: 'title' },
]

export const ACCENTS: Record<AccentColor, AccentDef> = {
  indigo: {
    l: { a: 'oklch(52% 0.18 275)', w: 'oklch(95.5% 0.03 275)', i: 'oklch(40% 0.16 275)', ln: 'oklch(88% 0.06 275)' },
    d: { a: 'oklch(72% 0.16 275)', w: 'oklch(28% 0.08 275)', i: 'oklch(85% 0.12 275)', ln: 'oklch(40% 0.1 275)' },
  },
  teal: {
    l: { a: 'oklch(55% 0.12 195)', w: 'oklch(94% 0.03 195)', i: 'oklch(38% 0.1 195)', ln: 'oklch(86% 0.05 195)' },
    d: { a: 'oklch(72% 0.12 195)', w: 'oklch(28% 0.06 195)', i: 'oklch(84% 0.1 195)', ln: 'oklch(40% 0.08 195)' },
  },
  plum: {
    l: { a: 'oklch(50% 0.16 330)', w: 'oklch(95% 0.03 330)', i: 'oklch(36% 0.14 330)', ln: 'oklch(86% 0.06 330)' },
    d: { a: 'oklch(70% 0.15 330)', w: 'oklch(28% 0.07 330)', i: 'oklch(85% 0.12 330)', ln: 'oklch(40% 0.1 330)' },
  },
  forest: {
    l: { a: 'oklch(50% 0.1 155)', w: 'oklch(94% 0.025 155)', i: 'oklch(34% 0.09 155)', ln: 'oklch(85% 0.04 155)' },
    d: { a: 'oklch(70% 0.1 155)', w: 'oklch(28% 0.05 155)', i: 'oklch(84% 0.09 155)', ln: 'oklch(40% 0.08 155)' },
  },
  graphite: {
    l: { a: 'oklch(30% 0.01 270)', w: 'oklch(94% 0.004 270)', i: 'oklch(22% 0.01 270)', ln: 'oklch(86% 0.008 270)' },
    d: { a: 'oklch(82% 0.008 270)', w: 'oklch(30% 0.01 270)', i: 'oklch(92% 0.006 270)', ln: 'oklch(45% 0.01 270)' },
  },
}

export const TIMELINE_DATA = [
  { year: 2018, count: 142, notable: 'Early Transformers (BERT preprint)' },
  { year: 2019, count: 1840, notable: 'BERT dominates NLP' },
  { year: 2020, count: 8920, notable: 'GPT-3, ViT, Scaling Laws' },
  { year: 2021, count: 18400, notable: 'Vision & multimodal Transformers' },
  { year: 2022, count: 32100, notable: 'ChatGPT era begins' },
  { year: 2023, count: 41200, notable: 'LLM proliferation' },
  { year: 2024, count: 39816, notable: 'Agents & reasoning models' },
]
