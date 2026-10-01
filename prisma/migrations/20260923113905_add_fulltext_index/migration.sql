-- 中文全文检索：MySQL ngram 解析器（ngram_token_size 默认为 2，适合中文分词）
-- 注：Prisma schema 不支持声明 FULLTEXT 索引，此处手工维护
ALTER TABLE `posts`
    ADD FULLTEXT INDEX `posts_fulltext_idx` (`title`, `summary`, `content`) WITH PARSER ngram;
