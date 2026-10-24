package com.securepm.projects;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class PageResponseTest {

    @Test
    void totalPagesEmptyList() {
        PageResponse<String> page = new PageResponse<>(List.of(), 0, 0, 20, 0);
        assertEquals(0, page.totalPages);
        assertEquals(0, page.total);
        assertEquals(0, page.items.size());
    }

    @Test
    void totalPagesSinglePage() {
        PageResponse<String> page = new PageResponse<>(List.of("a"), 1, 0, 20, 1);
        assertEquals(1, page.totalPages);
    }

    @Test
    void totalPagesExactBoundary() {
        // 20 items, page size 20 → exactly 1 page
        PageResponse<String> page = new PageResponse<>(List.of(), 20, 0, 20, 1);
        assertEquals(1, page.totalPages);
    }

    @Test
    void totalPagesPartialLastPage() {
        // 21 items, page size 20 → 2 pages (20 + 1)
        PageResponse<String> page = new PageResponse<>(List.of(), 21, 0, 20, 2);
        assertEquals(2, page.totalPages);
    }

    @Test
    void totalPagesMultipleExactPages() {
        // 40 items, page size 20 → exactly 2 pages
        PageResponse<String> page = new PageResponse<>(List.of(), 40, 0, 20, 2);
        assertEquals(2, page.totalPages);
    }

    @Test
    void totalPagesMultiplePartialPages() {
        // 41 items, page size 20 → 3 pages (20 + 20 + 1)
        PageResponse<String> page = new PageResponse<>(List.of(), 41, 0, 20, 3);
        assertEquals(3, page.totalPages);
    }

    @Test
    void totalPagesLargePageSize() {
        // 100 items, page size 50 → 2 pages
        PageResponse<String> page = new PageResponse<>(List.of(), 100, 0, 50, 2);
        assertEquals(2, page.totalPages);
    }

    @Test
    void totalPagesSingleItemLargePageSize() {
        // 1 item, page size 100 → 1 page
        PageResponse<String> page = new PageResponse<>(List.of(), 1, 0, 100, 1);
        assertEquals(1, page.totalPages);
    }

    @Test
    void fieldsAreCorrectlySet() {
        List<String> items = List.of("item1", "item2");
        PageResponse<String> page = new PageResponse<>(items, 5, 1, 2, 3);
        assertSame(items, page.items);
        assertEquals(5, page.total);
        assertEquals(1, page.page);
        assertEquals(2, page.size);
        assertEquals(3, page.totalPages);
    }

    @Test
    void defaultConstructorCreatesEmptyPage() {
        PageResponse<String> page = new PageResponse<>();
        assertNull(page.items);
        assertEquals(0, page.total);
        assertEquals(0, page.page);
        assertEquals(0, page.size);
        assertEquals(0, page.totalPages);
    }
}