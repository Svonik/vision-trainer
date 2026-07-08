# Научное обоснование (SCIENCE.md)

Терапевтические параметры Vision Trainer основаны на обзоре 20+ опубликованных
работ по дихоптической терапии амблиопии, бинокулярной супрессии и
вовлечённости/комплаенсу у детей. Полный систематический обзор (40+ публикаций,
методология поиска, детальный разбор) — `docs/research/2026-03-18-literature-review.md`
(локальный файл, не в git; этот документ — его выжимка, отгружаемая вместе с кодом).

Формулировки ниже — «параметр основан на …» / «источник: …». Это НЕ заявление о
доказанной клинической эффективности конкретно приложения Vision Trainer —
само приложение не проходило независимых клинических испытаний. Клиническая
эффективность, упомянутая в источниках, относится к протоколам/исследованиям
из литературы, а не к этому программному продукту.

## Параметр кода → источник

| Параметр (файл) | Значение | Источник | Принцип |
|---|---|---|---|
| `CLINICAL_CONTRAST.FELLOW_INITIAL` (`src/modules/constants.ts`) | 30% | Knox et al. 2012; Hess et al. 2010 | Старт контраста ведущего (парного) глаза 20-30% |
| `CLINICAL_CONTRAST.FELLOW_FLOOR` (`src/modules/constants.ts`) | 15% | Li et al. 2011 | Нижний предел контраста парного глаза |
| `CLINICAL_CONTRAST.FELLOW_CEILING` (`src/modules/constants.ts`) | 50% (было 100%) | Jost et al. 2020 | Верхний предел контраста ведущего глаза снижен со 100% до 50%: единственное прямое РКИ по инкременту контраста (Jost et al. 2020, J AAPOS, N=63) не нашло преимущества роста к 100% по остроте (P=0.73), а рост к 100% за ~18 дней устраняет межглазную контрастную разницу (ребаланс), на которой строится вся терапия. Потолок 50% сохраняет адаптивный вызов, но гарантирует, что разница между глазами (амблиопичный всегда 100%) никогда не исчезает. Это настраиваемый клинический параметр (clinical knob), а не жёсткая физиологическая константа — подлежит пересмотру по клиническим показаниям |
| `CLINICAL_CONTRAST.ROLLING_WINDOW_SIZE` (`src/modules/constants.ts`) | 20 | Li et al. 2011 | Скользящее окно из 20 испытаний для расчёта accuracy |
| `CLINICAL_CONTRAST.STEP_UP_THRESHOLD` (`src/modules/constants.ts`) | 0.75 | Knox et al. 2012 | Повышать контраст при accuracy > 75% |
| `CLINICAL_CONTRAST.STEP_DOWN_THRESHOLD` (`src/modules/constants.ts`) | 0.5 | Knox et al. 2012 (порог адаптирован) | Понижать контраст при accuracy < 50% (точное значение <50% — адаптация приложения, не дословно из Knox) |
| `CLINICAL_CONTRAST.STEP_SIZE` (`src/modules/constants.ts`) | 5% | Knox et al. 2012 | Шаг адаптации +5-10% (в приложении адаптировано до 5%) |
| `amblyopicEyeContrast: 100` (`src/modules/contrastEngine.ts`) | 100% фикс | Hess et al. 2010 | Амблиопичный (слабый) глаз не адаптируется — контраст всегда 100% |
| `therapyProtocol.ts`, возраст 4-7 (сессия) | 15 мин / сессия | Birch et al. 2020; Gambacorta et al. 2018 | Короткая сессия для дошкольников (ограниченная концентрация внимания) |
| `therapyProtocol.ts`, возраст 4-7 (курс) | 16 недель | app-specific | Литобзор указывает 12 недель для ОБЕИХ возрастных групп (Holmes et al. 2016); 16 недель для 4-7 — решение приложения, расхождение с литобзором |
| `therapyProtocol.ts`, возраст 8-12 | 25 мин / сессия, курс 12 недель | Li et al. 2013; Holmes et al. 2016 (PEDIG ATS18) | Более длинная сессия для школьников |
| `scheduleTracker.ts` (`targetDaysPerWeek`) | 5 дней/неделю | Luminopia/FDA 2021 | Частота домашней терапии (адаптировано с протокола Luminopia 6 дней/неделю) |
| `SuppressionTestStep.tsx` (balancePoint) / seed в `OnboardingWizard.tsx` | — | Hess et al. 2010; Li et al. 2011 | Количественный тест супрессии: контраст парного глаза, при котором видны оба стимула (баланс-поинт 20-40%) |
| `wellnessCheck.ts` (`shouldAlertDoctor` и др.) | — | Luminopia/FDA 2021 | Мониторинг побочных эффектов и алерт врачу обязательны для домашней цифровой терапии |
| `safetyTimer.ts` (лимиты сессии) | — | Luminopia/FDA 2021 | Лимиты длительности сессий обязательны |
| `sessionSummary.ts` (звёзды/стрик) | — | Boon et al. 2020 | Post-session summary — сильнейший предиктор комплаенса |
| 22 игровых модуля (`config/games.ts`) | — | Eastgate et al. 2006; Holmes et al. 2019 (PEDIG) | Разнообразие игр удерживает вовлечённость лучше одной игры |
| Экшн-жанры (Invaders, Asteroid, Flappy и др.) | — | Vedamurthy et al. 2015; Gambacorta et al. 2018 | Экшн-механики усиливают антисупрессивный эффект |
| Терапия продолжается при любом баланс-поинте | — | Bossi et al. 2017 | Улучшение возможно без полного преодоления супрессии |

## Источники (21 работа)

1. Hess RF, Mansouri B, Thompson B (2010). *A new binocular approach to the treatment of amblyopia in adults and children.* J AAPOS.
2. Li J, Thompson B, Deng D, Chan LYL, Yu M, Hess RF (2011). *Dichoptic training enables the adult amblyopic brain to learn.* Current Biology.
3. Li J, Hess RF, Chan LYL, Deng D, Yang X, Chen X, Yu M, Thompson B (2013). *Quantitative measurement of interocular suppression in anisometropic amblyopia.* Ophthalmology.
4. Li J, Spiegel DP, Hess RF, Chen Z, Chan LYL, Deng D, Yang X, Thompson B (2015). *Dichoptic training improves contrast sensitivity in adults with amblyopia.* Vision Research.
5. Holmes JM, Manh VM, Lazar EL, Beck RW, Birch EE, Kraker RT, Crouch ER, Erzurum SA, Khuddus N, Summers AI, Wallace DK — PEDIG ATS18 (2016). *Effect of a binocular iPad game vs patching in children aged 5 to 12 years with amblyopia: a randomized clinical trial.* JAMA Ophthalmology. PMID: 27548710.
6. Kelly KR, Jost RM, Dao L, Beauchamp CL, Leffler JN, Birch EE (2016). *Binocular iPad game vs patching for treatment of amblyopia in children.* JAMA Ophthalmology.
7. Gao TY, Guo CX, Babu RJ, et al. (2018). *Effectiveness of a binocular video game vs placebo video game for improving visual functions in older children, teenagers, and adults with amblyopia.* JAMA Ophthalmology.
8. Herbison N, Cobb S, Gregson R, Ash I, Eastgate R, Purdy J, Hepburn T, MacKeith D, Foss A — I-BiT (2016). *Interactive binocular treatment (I-BiT) for amblyopia: results of a pilot study of 3D shutter glasses system.* Eye.
9. Knox PJ, Simmers AJ, Gray LS, Cleary M (2012). *An exploratory study: prolonged periods of binocular stimulation can provide an effective treatment for childhood amblyopia.* Investigative Ophthalmology & Visual Science.
10. Birch EE, Jost RM, De La Cruz A, Kelly KR, Beauchamp CL, Dao L, Stager D Jr, Leffler JN (2020). *Binocular amblyopia treatment with contrast rebalanced movies in children aged 3 to 8 years.* J AAPOS.
11. Bossi M, Tailor VK, Anderson EJ, Greenwood JA, Dahlmann-Noor A, Rubin GS, Rees G, Dakin SC (2017). *Binocular therapy for childhood amblyopia improves vision without breaking interocular suppression.* Investigative Ophthalmology & Visual Science.
12. Vedamurthy I, Nahum M, Huang SJ, Zheng F, Bayliss J, Bavelier D, Levi DM (2015). *A dichoptic custom-made action video game as a treatment for adult amblyopia.* Vision Research.
13. Gambacorta C, Nahum M, Vedamurthy I, Bayliss J, Jordan J, Bavelier D, Levi DM (2018). *An action video game for the treatment of amblyopia in children: A feasibility study.* Vision Research.
14. Boon MY, Henry TE, Suttle CM (2020). *Predictors of adherence to treatment for amblyopia: a systematic review.* Clinical and Experimental Optometry.
15. Holmes JM, Melia BM, Bradfield YS, Cruz OA, Forbes BJ — PEDIG (2019). *Adherence to and factors associated with adherence to binocular Dig Rush game treatment for amblyopia.* JAMA Ophthalmology.
16. Eastgate RM, Griffiths GD, Waddingham PE, Moody AD, Butler TKH, Cobb SV, Comaish IF, Scally AJ, Haworth SM, Gregson RM (2006). *Modified virtual reality technology for treatment of amblyopia.* Eye.
17. Luminopia, Inc. / FDA (2021). *Luminopia One — FDA De Novo Classification (DEN200076).* FDA Decision Summary.
18. Hess RF, Thompson B (2015). *Amblyopia and the binocular approach to its therapy.* Vision Research.
19. Tsirlin I, Colpa L, Goltz HC, Wong AMF (2015). *Behavioral training as new treatment for adult amblyopia: a meta-analysis and systematic review.* Investigative Ophthalmology & Visual Science.
20. Webber AL, Wood J (2005). *Amblyopia: prevalence, natural history, functional effects and treatment.* Clinical and Experimental Optometry.
21. Jost RM, Stager DR Jr, Beauchamp CL, Wang YZ, Leffler J, Birch EE (2020). *A contrast-based dichoptic Portable Vision Trainer for amblyopia treatment: a randomized clinical trial.* J AAPOS. NCT03288948. (N=63; head-to-head comparison of fellow-eye contrast increment protocols (10%/5%/0%-constant) — no significant difference in visual acuity outcome, P=0.73; authors' conclusion: "no scientific evidence that a contrast increment is necessary.")

Полный обзор со сравнительными таблицами эффективности, методологией поиска и
дополнительным контекстом — `docs/research/2026-03-18-literature-review.md`.
