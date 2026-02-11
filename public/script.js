/* script.js */
document.addEventListener('DOMContentLoaded', () => {
    
    // Mobile Navigation Toggle
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if(menuBtn) {
        menuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // FAQ Accordion Logic
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        item.addEventListener('click', () => {
            item.classList.toggle('active');
            const answer = item.querySelector('.faq-answer');
            if (item.classList.contains('active')) {
                answer.style.maxHeight = answer.scrollHeight + "px";
                answer.style.opacity = "1";
                answer.style.marginTop = "10px";
            } else {
                answer.style.maxHeight = "0";
                answer.style.opacity = "0";
                answer.style.marginTop = "0";
            }
        });
    });

    // Scroll Animation (Fade In)
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    const fadeElements = document.querySelectorAll('.card, h2, .hero-content');
    fadeElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Add CSS class for visibility triggered by JS
    const styleSheet = document.createElement("style");
    styleSheet.innerText = ".visible { opacity: 1 !important; transform: translateY(0) !important; }";
    document.head.appendChild(styleSheet);
});